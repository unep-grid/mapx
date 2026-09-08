import eslint from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import style from "./quality/style.config.mjs";

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    // Preserve the API's existing lint command scope; broader adoption is separate.
    files: [
      "api/index.js",
      "api/routines.js",
      "api/vitest.config.js",
      "api/modules/**/*.test.js",
      "quality/**/*.mjs",
      "eslint.config.mjs",
      "commitlint.config.js",
    ],
    rules: eslint.configs.recommended.rules,
  },

  {
    files: ["app/src/js/sdk/examples/**/*.js"],
    languageOptions: {
      globals: {
        mxsdk: "readonly",
        $: "readonly",
        jQuery: "readonly",
        React: "readonly",
        ReactDOM: "readonly",
        nipplejs: "readonly",
      },
    },
    plugins: { react },
    settings: { react: { version: "16" } },
    rules: {
      ...eslint.configs.recommended.rules,
      ...react.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },

  ...style,
  {
    files: [
      "app/src/js/**/*.{js,jsx,ts,tsx}",
      "app/src/templates/*.js",
      "maintenance/src/**/*.js",
      "maintenance/service-worker.js",
    ],
    languageOptions: { globals: globals.browser },
  },
  {
    files: [
      "*.{js,mjs,cjs}",
      "quality/**/*.mjs",
      "api/**/*.js",
      "app/webpack/*.js",
      "app/src/node/*.js",
      "app/src/sprites/**/*.js",
      "app/*.js",
      "app/test/**/*.js",
      "maintenance/*.js",
      "maintenance/test/**/*.js",
    ],
    languageOptions: { globals: globals.nodeBuiltin },
  },
  {
    files: [
      "app/webpack/sw_listen_skip_waiting_install.js",
      "maintenance/service-worker.js",
    ],
    languageOptions: { globals: globals.serviceworker },
  },
  {
    // Actual CommonJS tooling; preserve runtime loading during normalization.
    files: [
      "**/*.cjs",
      "commitlint.config.js",
      "app/postcss.config.js",
      "app/webpack/webpack.*.js",
      "app/src/node/build_dict.js",
      "app/src/sprites/source/svg/patterns/index.js",
    ],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
  },
  {
    files: [
      "app/src/js/north_arrow/index.js",
      "app/src/js/download/index.js",
      "app/src/js/map_helpers/index.js",
      "app/src/js/panel_main/index.js",
      "app/src/js/string_util/index.js",
      "app/src/js/notif_center/nc.js",
    ],
    languageOptions: { globals: { require: "readonly" } },
  },
  {
    files: ["app/src/js/window/**/*.js", "app/src/js/project/list*.js"],
    rules: {
      "no-restricted-globals": ["error", "$", "jQuery", "Shiny"],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='document'][callee.property.name=/^(getElementById|getElementsByClassName|getElementsByName|getElementsByTagName|querySelector|querySelectorAll)$/]",
          message:
            "New components must retain owned DOM references instead of querying the global document.",
        },
        {
          selector:
            "AssignmentExpression[left.object.name=/^(window|globalThis)$/]",
          message: "New modules must not expose mutable application globals.",
        },
      ],
    },
  },
];
