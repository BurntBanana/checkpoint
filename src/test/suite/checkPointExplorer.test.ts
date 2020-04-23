import * as assert from 'assert';
import * as vscode from 'vscode';
import * as CheckPointExplorer from '../../CheckPointExplorer';
import {ExtensionContext, ExtImpl, Memento, MemImpl} from './createContext';
import {writeFileSync} from 'fs';
import { join } from 'path';

describe('CheckPoint Explorer', () => {
    const path = join(__dirname, "test.txt");
    let x : ExtensionContext = new ExtImpl([],new MemImpl(),new MemImpl(),"test","test","test","test");
    writeFileSync(path, null);
    vscode.window.showTextDocument(vscode.Uri.file(path));
    // describe('Commence Tracking', () => {

    // })

});
