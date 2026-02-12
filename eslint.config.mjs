// ESLint 9 flat config
// This is a minimal working config that avoids FlatCompat circular reference issues
// For full Next.js rules, we'll need to wait for better ESLint 9 support

import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
	{
		ignores: [
			"**/node_modules/**",
			"**/.next/**",
			"**/out/**",
			"**/build/**",
			"**/dist/**",
			"**/*.config.js",
			"**/*.config.ts",
			"**/*.config.mjs",
		],
	},
	{
		files: ["**/*.{js,jsx,ts,tsx}"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		plugins: {
			react,
			"react-hooks": reactHooks,
		},
		settings: {
			react: {
				version: "detect",
			},
		},
		rules: {
			"no-unused-vars": "off",
			"no-console": "off", // Allow console in Next.js
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "warn",
		},
	},
	{
		files: ["**/*.{ts,tsx}"],
		languageOptions: {
			parser: typescriptParser,
			ecmaVersion: "latest",
			sourceType: "module",
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
				project: "./tsconfig.json",
			},
		},
		plugins: {
			"@typescript-eslint": typescriptEslint,
		},
		rules: {
			// Basic rules - more comprehensive rules require Next.js configs which have circular reference issues
			"no-unused-vars": "off", // TypeScript handles this
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
			"no-console": "off", // Allow console in Next.js
		},
	},
];
