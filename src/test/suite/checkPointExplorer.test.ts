import * as assert from 'assert';
import * as vscode from 'vscode';
import * as CheckPointExplorer from '../../CheckPointExplorer';
import {ExtensionContext, ExtImpl, Memento, MemImpl} from './createContext';

describe('CheckPoint Explorer', () => {
    let x : ExtensionContext = new ExtImpl([],new MemImpl(),new MemImpl(),"test","test","test","test");

});
