// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config({ ignores: ["dist", "storybook-static", "coverage", "e2e/**/*", ".storybook/**/*", ".storybook-forced-colors/**/*"] }, {
  extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
  files: ["**/*.{ts,tsx}"],
  languageOptions: {
    ecmaVersion: 2020,
    globals: globals.browser,
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  plugins: {
    "react-hooks": reactHooks,
    "react-refresh": reactRefresh,
  },
  rules: {
    ...reactHooks.configs.recommended.rules,
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    "@typescript-eslint/no-unused-vars": "off",
  },
}, {
  // Disable type-aware linting for config files
  files: ["*.config.ts", "*.config.js", "playwright.config.ts"],
  extends: [tseslint.configs.disableTypeChecked],
}, {
  // Relax some strict rules for test and story files
  files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/*.stories.{ts,tsx}", "**/*.integration.test.{ts,tsx}", "**/tests/**/*", "**/e2e/**/*"],
  rules: {
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unsafe-argument": "off",
    "@typescript-eslint/no-floating-promises": "off",
    "@typescript-eslint/require-await": "off",
    "react-refresh/only-export-components": "off",
  },
}, {
  // Integration tests must run against the live-tick harness: take `user` from
  // `await renderSimulator()` (which wraps it to emit a deterministic
  // MILL_STATE_CHANGED after every interaction), never a raw userEvent.setup().
  // A bare setup() yields a tick-blind `user` and silently reintroduces the
  // class of bug (US-046 diagnostics auto-skip, the SAV CHG / OEM confirmation
  // wipe) that running under a connected encoder is meant to catch.
  files: ["**/*.integration.test.{ts,tsx}"],
  rules: {
    "no-restricted-syntax": ["error", {
      selector: "CallExpression[callee.object.name='userEvent'][callee.property.name='setup']",
      message: "Don't call userEvent.setup() in an integration test — take `user` from `await renderSimulator()` so interactions run under live mill ticks. (Need a dead source? `renderSimulator({ millSource: 'noop' })`.)",
    }],
  },
}, storybook.configs["flat/recommended"]);
