import * as path from 'path';
import { runTests } from 'vscode-test';
import { instrument } from './coverage';


async function main() {
	try {
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');

		let extensionTestsPath = path.resolve(__dirname, './suite/index');

		if (process.argv.indexOf('--coverage') >= 0) {
			// generate instrumented files at out-cov
			instrument();

			// load the instrumented files
			extensionTestsPath = path.resolve(__dirname, '../../out-cov/test/suite/index');

			// signal that the coverage data should be gathered
			process.env['GENERATE_COVERAGE'] = '1';
		}

		await runTests({
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: [
				'--disable-extensions',
			],
		});

	} catch (err) {
		console.error('Failed to run tests');
		console.error(err);
		process.exit(1);
	}
}

main();
