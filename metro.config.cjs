const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// ✅ Evita resolver ESM/exports problemáticos (Zustand)
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

// ✅ CLAVE: deshabilita package exports (reduce casos de "zustand/esm")
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
