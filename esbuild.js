const esbuild = require("esbuild");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

async function main() {
	// Create alias configuration to deduplicate React
	const reactPath = require.resolve('react');
	const reactJsxPath = require.resolve('react/jsx-runtime');

	// Build extension entry point as CommonJS for VS Code compatibility
	const extensionCtx = await esbuild.context({
		entryPoints: [
			'src/extension.ts'
		],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/extension.js',
		external: [
			'vscode',
			'../dist/cli' // Mark the actual path as external to prevent bundling
		],
		alias: {
			// Force all React imports to resolve to the same instance
			'react': reactPath,
			'react/jsx-runtime': reactJsxPath,
		},
		logLevel: 'silent',
		jsx: 'automatic',
		target: 'node18',
		plugins: [
			esbuildProblemMatcherPlugin,
		],
	});

	// Build CLI as CommonJS for VS Code extension to require
	// Bundle ink and React together to avoid duplicate React instances
	const cliCtx = await esbuild.context({
		entryPoints: [
			'src/cli.tsx'
		],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/cli.js',
		external: [
			// Only keep yoga external since it has WASM
			'yoga-layout',
			'yoga-layout/load'
		],
		alias: {
			// Force all React imports to resolve to the same instance
			'react': reactPath,
			'react/jsx-runtime': reactJsxPath,
		},
		logLevel: 'silent',
		jsx: 'automatic',
		target: 'node18',
		plugins: [
			esbuildProblemMatcherPlugin,
		],
	});

	if (watch) {
		await extensionCtx.watch();
		await cliCtx.watch();
	} else {
		await extensionCtx.rebuild();
		await cliCtx.rebuild();
		await extensionCtx.dispose();
		await cliCtx.dispose();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
