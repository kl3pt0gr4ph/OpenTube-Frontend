import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import path from 'path';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-node';

export default defineConfig({
	plugins: [
		!process.env.VITEST && tailwindcss(),
		sveltekit({
			preprocess: vitePreprocess(),
			adapter: adapter({
				precompress: false,
				envPrefix: ''
			})
		})
	],
	server: {
		port: parseInt(process.env.FRONTEND_PORT || '5173'),
		strictPort: true
	},
	build: {
		chunkSizeWarningLimit: 1000
	},
	test: {
		// Global test settings
		globals: true,
		expect: { requireAssertions: true },

		// Coverage configuration
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			exclude: [
				'node_modules/',
				'src/tests/',
				'src/tests/helpers/',
				'src/tests/stubs/',
				'src/tests/fixtures/',
				'**/*.d.ts',
				'**/*.config.*',
				'**/mockData/',
				'dist/',
				'.svelte-kit/',
				'src/lib/assets/**'
			],
			thresholds: {
				lines: 85,
				functions: 85,
				branches: 80,
				statements: 85,
				// risk-weighted floors
				'src/lib/utils/**': { branches: 95, lines: 95 },
				'src/lib/adapters/**': { branches: 92, lines: 95 },
				'src/lib/api/**': { branches: 90, lines: 95 }
			}
		},

		// Mock configuration
		mockReset: true,
		restoreMocks: true,
		clearMocks: true,

		// Test execution
		testTimeout: 10000,
		hookTimeout: 10000,

		// Projects for different test types
		projects: [
			// Client tests (Svelte components)
			{
				resolve: {
					conditions: ['browser'],
					alias: {
						$lib: path.resolve('./src/lib'),
						$app: path.resolve('./node_modules/@sveltejs/kit/src/runtime/app'),
						'$env/static/public': path.resolve('./src/tests/env')
					}
				},
				test: {
					name: 'client',
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts'],
					environment: 'jsdom',
					globals: true,
					mockReset: true,
					restoreMocks: true,
					clearMocks: true,
					testTimeout: 10000,
					hookTimeout: 10000
				}
			},
			// Server tests (utilities, API)
			{
				resolve: {
					alias: {
						$lib: path.resolve('./src/lib'),
						'$env/static/public': path.resolve('./src/tests/env')
					}
				},
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					setupFiles: ['./vitest-setup-server.ts'],
					globals: true,
					mockReset: true,
					restoreMocks: true,
					clearMocks: true,
					testTimeout: 10000,
					hookTimeout: 10000
				}
			}
		]
	}
});
