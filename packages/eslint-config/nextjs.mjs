// Shared ESLint 9 flat config for Next.js apps
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default function nextjsConfig(tsconfigPath = './tsconfig.json') {
	return [
		{
			ignores: [
				'**/node_modules/**',
				'**/.next/**',
				'**/out/**',
				'**/build/**',
				'**/dist/**',
				'**/*.config.js',
				'**/*.config.ts',
				'**/*.config.mjs',
			],
		},
		{
			files: ['**/*.{js,jsx,ts,tsx}'],
			languageOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
			plugins: {
				react,
				'react-hooks': reactHooks,
			},
			settings: {
				react: {
					version: 'detect',
				},
			},
			rules: {
				'no-unused-vars': 'off',
				'no-console': 'off',
				'react-hooks/rules-of-hooks': 'error',
				'react-hooks/exhaustive-deps': 'warn',
			},
		},
		{
			files: ['**/*.{ts,tsx}'],
			languageOptions: {
				parser: typescriptParser,
				ecmaVersion: 'latest',
				sourceType: 'module',
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
					project: tsconfigPath,
				},
			},
			plugins: {
				'@typescript-eslint': typescriptEslint,
			},
			rules: {
				'no-unused-vars': 'off',
				'@typescript-eslint/no-unused-vars': [
					'warn',
					{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
				],
				'no-console': 'off',
			},
		},
	];
}
