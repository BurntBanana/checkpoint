import * as assert from 'assert';
import * as extension from '../../extension';
import {ExtensionContext, ExtImpl, MemImpl} from './createContext';
import {logger, silenceLogs} from '../../logger';
import {commands} from 'vscode';

// const logPath = join(__dirname, "extension")
const context : ExtensionContext = new ExtImpl([],new MemImpl(),new MemImpl(),"test","test","test",__dirname);

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

    
    it('Should dispose off registered commands',  () => {
        extension.deactivate(context);
        context.subscriptions.push(commands.registerCommand('checkPointExplorer.commenceTracking', () => {}));
        assert.equal(context.subscriptions.length, 6);
    });

    after( () => {
        extension.deactivate(context);
    });
});