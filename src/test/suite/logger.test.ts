import * as assert from 'assert';
import { logger, initLogger, silenceLogs } from '../../logger';
import { join } from 'path';
import { unlinkSync } from 'fs';
import { workspace } from 'vscode';

describe('Logger', () => {

    before(() => {
        silenceLogs(true);
    });

    it('Should initialise logger with only console transport, if path is invalid', () => {
        initLogger(join(__dirname, 'invalid', 'test'));
        assert.equal(logger.transports.length, 2); //circular and console 
    });

    it('Should initialise logger with console and file transport, if path is valid', () => {
        initLogger(__dirname);
        assert.equal(logger.transports.length, 4); //circular, console, file, error file 
    });

});
