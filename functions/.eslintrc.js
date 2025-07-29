module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
    ecmaVersion: 2020, // เพิ่มบรรทัดนี้
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "**/*.js", // Ignore generated JS files
  ],
  plugins: ["@typescript-eslint", "import"],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    "indent": ["error", 2],
    "object-curly-spacing": ["error", "always"],
    "require-jsdoc": 0, // ปิดการบังคับให้เขียน JSDoc
    "valid-jsdoc": 0, // ปิดการบังคับให้เขียน JSDoc
    "max-len": ["error", { "code": 120 }], // เพิ่มความยาวบรรทัด
    // แก้ไขกฎที่เป็นปัญหาโดยตรง
    "no-unused-expressions": "off",
    "@typescript-eslint/no-unused-expressions": ["error"],
  },
};
