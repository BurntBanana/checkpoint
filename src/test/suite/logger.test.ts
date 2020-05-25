import * as assert from 'assert';
import { logger, initLogger, silenceLogs } from '../../logger';
import { join } from 'path';
import { unlinkSync } from 'fs';
import { workspace } from 'vscode';

describe('Logger', () => {

    before(() => {
        silenceLogs(true);
    });

    it('Should initialise logger with no transport, if path is invalid', () => {
        initLogger(join(__dirname, 'invalid', 'test'));
        assert.equal(logger.transports.length, 0); //circular and console 
    });

    it('Should initialise logger with file transports, if path is valid', () => {
        initLogger(__dirname);
        assert.equal(logger.transports.length, 2); //circular, console, file, error file 
    });

});
