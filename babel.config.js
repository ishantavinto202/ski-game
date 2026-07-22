export default function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["."],
          alias: {
            "@": ".",
            "@assets": "./assets",
            "@components": "./components",
            "@hooks": "./hooks",
            "@utils": "./utils",
            "@context-and-provider": "./context-and-provider",
            "@services": "./services",
          },
        },
      ],
      "react-native-reanimated/plugin",
      // "react-native-worklets/plugin",
    ],
  };
}
