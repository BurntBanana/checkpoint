import * as assert from 'assert';
import * as extension from '../../extension';
import {ExtensionContext, ExtImpl, MemImpl, dataStore} from './createContext';

import {logger, silenceLogs} from '../../logger';

const context : ExtensionContext = new ExtImpl([],new MemImpl(),new MemImpl(),"test","test","test","logtest");

describe('Extension', () => {

    before('Activate extension', () => {
        silenceLogs(true);
        extension.activate(context);
    });
    
    
    it('Should initalise logger with console and file log', () => {
        assert.equal(logger.transports.length, 4);
    });

    it('Should register commenceTracking, openCheckpoint, deleteSingle, deleteAll and setActive commands',  () => {
        assert.equal(context.subscriptions.length, 5);
    });

    after(() => {
        extension.deactivate(context);
    });
});