import { defineConfig } from 'vite-plus'

export default defineConfig({
    fmt: {
        singleQuote: true,
        trailingComma: 'all',
        semi: false,
        tabWidth: 4,
        ignorePatterns: [
            'dist/**',
            'coverage/**',
            'src/prisma/**',
            'migrations/**',
            'pnpm-lock.yaml',
        ],
    },
    lint: {
        options: { typeAware: true },
        env: { node: true },
        rules: {
            'typescript/no-explicit-any': 'off',
            'typescript/no-floating-promises': 'error',
        },
        ignorePatterns: ['dist/**', 'coverage/**', 'src/prisma/**', 'migrations/**'],
    },
})
