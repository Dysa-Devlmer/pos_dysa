/**
 * Metro config para Expo + NativeWind v4 + monorepo pnpm.
 *
 * Gotcha G-M07: requiere withNativeWind wrapper para que el CSS global
 * se compile. El `input` apunta al global.css con directivas @tailwind.
 *
 * Monorepo pnpm: habilitamos `symlinks` y extendemos nodeModulesPaths
 * para que Metro resuelva @repo/domain y @repo/api-client del workspace.
 */
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Ver node_modules del monorepo root también (pnpm symlinks)
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Gotcha G-M35 — pnpm + shamefully-hoist duplica fisicamente `react` dentro
// de cada node_modules/<pkg>/node_modules/react. Metro resuelve cada copia
// como modulo distinto → "Invalid hook call: more than one copy of React".
// Bug se manifiesta como pantalla negra en release y crash en web preview.
//
// Fix: forzar singletons via extraNodeModules + disableHierarchicalLookup
// (patron oficial https://docs.expo.dev/guides/monorepos/). Cualquier
// require("react"|"react-dom"|"react-native") resuelve al MISMO path fisico.
// expo-sqlite/web carga wa-sqlite.wasm — Metro lo ignora por default.
// Solo afecta target web (preview en browser); en native usa bindings JSI.
if (!config.resolver.assetExts.includes("wasm")) {
  config.resolver.assetExts.push("wasm");
}

// Solo forzamos singletons via extraNodeModules — sin disableHierarchicalLookup
// (con true Metro entra en bundle loop infinito). extraNodeModules tiene
// precedencia en resolveRequest() → cualquier require("react") y co. resuelve
// al MISMO path fisico, eliminando duplicados de React.
// Gotcha G-M37 — pnpm con peer-deps resuelve react-native-css-interop a
// MULTIPLES paths fisicos (uno por combinacion peer). Resultado en bundle:
// dos modulos con `interopComponents = new Map()` distintos → components.js
// registra View/Text en map A, wrap-jsx busca en map B → className nunca
// se transforma. Síntoma: DOM solo tiene clases css-*/r-* de RN-web, las
// utilities tailwind del CSS bundle existen pero no se aplican.
// Fix: forzar singleton via resolveRequest tambien para nativewind +
// react-native-css-interop (y sus jsx-runtime entry points).
const SINGLETON_PACKAGES = [
  "react",
  "react-dom",
  "react-native",
  "react-native-web",
  "react-native-css-interop",
  "nativewind",
];
const singletonRoots = Object.fromEntries(
  SINGLETON_PACKAGES.map((pkg) => [
    pkg,
    path.resolve(projectRoot, `node_modules/${pkg}`),
  ]),
);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  ...singletonRoots,
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Match exact package name OR subpath (`pkg/...`) for any singleton.
  for (const pkg of SINGLETON_PACKAGES) {
    if (moduleName === pkg || moduleName.startsWith(`${pkg}/`)) {
      const target = singletonRoots[pkg];
      return context.resolveRequest(
        { ...context, originModulePath: path.join(target, "package.json") },
        moduleName,
        platform,
      );
    }
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
