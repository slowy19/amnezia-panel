/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
export default {
    printWidth: 100,
    tabWidth: 4,
    useTabs: false,
    singleQuote: true,
    bracketSameLine: true,
    trailingComma: "es5",
    plugins: ["prettier-plugin-tailwindcss"],
};
