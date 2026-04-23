/**
 * Babel config para Expo + NativeWind v4.
 *
 * Gotcha G-M07: NativeWind requiere babel plugin `nativewind/babel` Y
 * metro transformer. Sin ambos, className se ignora silenciosamente en
 * producción. NO quitar nunca el jsxImportSource.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
