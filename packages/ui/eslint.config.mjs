import { createMetronEslintConfig } from "../eslint-config/base.mjs";
import tseslint from "typescript-eslint";

export default tseslint.config(
  ...createMetronEslintConfig(import.meta.dirname),
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["vite.config.ts", "preview/main.tsx"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
