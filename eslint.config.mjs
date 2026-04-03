import js from '@eslint/js'
import globals from 'globals'
import ts from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import eslintPluginPrettier from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

const projectRules = {
	...ts.configs.recommended.rules,
	'prettier/prettier': 'error',
	'@typescript-eslint/no-floating-promises': 'error',
	'@typescript-eslint/no-misused-promises': 'error',
	'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
	'@typescript-eslint/consistent-type-imports': 'error',
	'no-process-exit': 'error',
	'sort-imports': ['warn', { ignoreDeclarationSort: true }],
	'no-return-await': 'warn',
	'no-console': 'warn',
	'@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-function-type': 'off',
}

export default [
    {
        ...js.configs.recommended,
    },
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: ['./tsconfig.json'],
                tsconfigRootDir: import.meta.dirname,
                sourceType: 'module',
                ecmaVersion: 'latest'
            },
            globals: globals.node
        },
        plugins: {
            '@typescript-eslint': ts,
            prettier: eslintPluginPrettier
        },
        rules: projectRules
    },
    {
        files: ['examples/**/*.ts', 'scripts/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: ['./tsconfig.other.json'],
                tsconfigRootDir: import.meta.dirname
            },
            globals: globals.node
        },
        plugins: {
            '@typescript-eslint': ts,
            prettier: eslintPluginPrettier
        },
        rules: {
            ...projectRules,
            '@typescript-eslint/no-floating-promises': 'off',
            '@typescript-eslint/no-misused-promises': 'off',
            '@typescript-eslint/no-unused-vars': 'off'
        }
    },

    prettierConfig
]
