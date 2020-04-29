import * as assert from 'assert';
import * as vscode from 'vscode';
import * as extension from '../../extension';
import {CheckPointObject} from '../../Interfaces/checkPointInterfaces';
import {ExtensionContext, ExtImpl, MemImpl, dataStore} from './createContext';
import {writeFileSync} from 'fs';
import { join } from 'path';

const testFilePath = join(__dirname, "test.txt");
const context : ExtensionContext = new ExtImpl([],new MemImpl(),new MemImpl(),"test","test","test","test");

// describe('Test registered commands', () => {
//     before('Initialize class objects & create new test file', () => {
//         writeFileSync(testFilePath, "0");
//         extension.activate(context);
//     });
    
    
//     it('Test commence tracking', async () => {
//         const textEditor = await vscode.window.showTextDocument(vscode.Uri.file(testFilePath));
//         if(textEditor){
//             vscode.commands.executeCommand('checkPointExplorer.commenceTracking');
//             const currentDocument : vscode.TextDocument = textEditor.document as vscode.TextDocument;
//             const currentDocumentText = currentDocument.getText();
//             const checkPointObject : CheckPointObject = dataStore[currentDocument.fileName as string] as CheckPointObject;
//             assert.equal(currentDocumentText, checkPointObject.current);
//         }
//     });
// });

