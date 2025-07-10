module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true,
  },
  plugins: ["prettier"],
  extends: ["eslint:recommended", "plugin:prettier/recommended"],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
  },
  globals: {
    ethers: "readonly",
    hre: "readonly",
    upgrades: "readonly",
    artifacts: "readonly",
    contract: "readonly",
    web3: "readonly",
  },
  rules: {
    "prettier/prettier": "error",
    "no-console": "off", // 允许在scripts中使用console
    "no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "prefer-const": "error",
    "no-var": "error",
    "object-shorthand": "error",
    "prefer-arrow-callback": "error",
    "prefer-template": "error",
    "template-curly-spacing": "error",
    "arrow-spacing": "error",
    "comma-dangle": ["error", "always-multiline"],
    "eol-last": "error",
    indent: ["error", 2, { SwitchCase: 1 }],
    "linebreak-style": ["error", "unix"],
    quotes: ["error", "double"],
    semi: ["error", "always"],
    "no-process-exit": "off", // 允许在scripts中使用process.exit
  },
  overrides: [
    {
      files: ["test/**/*.js"],
      env: {
        mocha: true,
      },
      rules: {
        "no-unused-expressions": "off",
        "no-console": "off",
      },
    },
    {
      files: ["scripts/**/*.js"],
      rules: {
        "no-console": "off",
        "no-process-exit": "off",
      },
    },
    {
      files: ["hardhat.config.js", "local-config.js"],
      rules: {
        "no-console": "off",
      },
    },
  ],
};
