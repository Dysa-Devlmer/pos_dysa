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

// Resolver packages del workspace como sources (no node_modules compilados)
config.resolver.disableHierarchicalLookup = false;

module.exports = withNativeWind(config, { input: "./global.css" });
