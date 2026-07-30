module.exports = function (api) {
    api.cache(true);

    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }],
            "nativewind/babel",
        ],
        plugins: [
            [
                "module:react-native-dotenv",
                {
                    moduleName: "@env",
                    path: ".env",
                    safe: false,
                    allowUndefined: true,
                },
            ],
            // Strip every console.* call from production/release builds so no
            // debug logs ship to the Play Store. Dev builds keep their logs.
            ...(process.env.NODE_ENV === "production" || process.env.BABEL_ENV === "production"
                ? [["transform-remove-console", { exclude: [] }]]
                : []),
        ],
    };
};
