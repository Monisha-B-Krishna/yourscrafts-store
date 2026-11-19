import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  {
    // Playwright fixtures call `use(...)`, which isn't a React hook.
    files: ["tests/e2e/**"],
    rules: { "react-hooks/rules-of-hooks": "off", "@typescript-eslint/no-this-alias": "off" },
  },
];

export default eslintConfig;
