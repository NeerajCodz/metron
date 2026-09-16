import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export function createMetronEslintConfig(tsconfigRootDir) {
  return tseslint.config(
    {
      ignores: [
        "**/.turbo/**",
        "**/artifacts/**",
        "**/cache/**",
        "**/coverage/**",
        "**/dist/**",
        "**/generated/**",
        "**/lib/**",
        "**/node_modules/**",
        "**/_generated/**",
      ],
    },
    {
      files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
      extends: [eslint.configs.recommended],
      languageOptions: {
        globals: globals.node,
      },
    },
    {
      files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
      extends: [eslint.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
      languageOptions: {
        globals: globals.node,
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      rules: {
        "@typescript-eslint/consistent-type-imports": [
          "error",
          { fixStyle: "inline-type-imports" },
        ],
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-misused-promises": "error",
      },
    },
  );
}
