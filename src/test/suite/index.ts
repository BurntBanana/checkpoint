import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';
import { createReport } from '../coverage';

export function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'bdd',
		color: true,
		timeout: 7500,
		reporter: "mocha-multi-reporters",
		reporterOptions: {
			reporterEnabled: "spec, xunit",
			xunitReporterOptions: {
				output: path.join(__dirname, "..", "..", "test-results.xml")
			}
		}
	});

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise((c, e) => {
		glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
			if (err) {
				return e(err);
			}

			// Add files to the test suite
			files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

			try {
				// Run the mocha test
				mocha.run(failures => {
					if (failures > 0) {
						e(new Error(`${failures} tests failed.`));
					} else {
						c();
					}
				});
			} catch (err) {
				console.error(err);
				e(err);
			}
		});
	}).then(() => {
		// Tests have finished executing, check if we should generate a coverage report
		if (process.env['GENERATE_COVERAGE']) {
			createReport();
		}
	});
}
