import * as assert from 'assert';
import { deactivate } from '../../extension';
import { ExtensionContext, ExtImpl, MemImpl, dataStore } from './createContext';
import { logger, silenceLogs } from '../../logger';
import { CheckPointExplorer } from '../../checkPointExplorer';
import * as vscode from 'vscode';
import { writeFileSync, existsSync, unlinkSync, unlink } from 'fs';
import { join } from 'path';
import { CheckPointObject } from '../../Interfaces/checkPointInterfaces';


// const logPath = join(__dirname, "extension")
const context: ExtensionContext = new ExtImpl([], new MemImpl(), new MemImpl(), "test", "test", "test", __dirname);
let checkPointExplorer: CheckPointExplorer;
describe('CheckPointExplorer', () => {
    const testFilePath = join(__dirname, "test.txt");

    before('Call constructor', () => {
        silenceLogs(true);
        checkPointExplorer = new CheckPointExplorer(context);
    });

    it('Should register commenceTracking, openCheckpoint, deleteSingle, deleteAll and setActive commands', () => {
        assert.equal(context.subscriptions.length, 5);
    });

    describe("Commence Tracking", () => {

        it('Should not commence tracking for undefined file', () => {
            vscode.commands.executeCommand('checkPointExplorer.commenceTracking');
            assert.equal(dataStore[vscode.window.activeTextEditor?.document.fileName as string], undefined);
        });


        it('Should create inital checkpoint for active file', async () => {
            await vscode.window.showTextDocument(vscode.Uri.file(testFilePath));
            vscode.commands.executeCommand('checkPointExplorer.commenceTracking');
            const { document } = vscode.window.activeTextEditor as vscode.TextEditor;
            const checkPointObject: CheckPointObject = dataStore[document.fileName] as CheckPointObject;
            assert.equal(checkPointObject.current, document.getText());
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        });

        afterEach((done) => {
            if (existsSync(testFilePath)) {
                unlinkSync(testFilePath);
            }
            else {
                writeFileSync(testFilePath, "0");
            }
            done();
        });

    });

    describe("Delete All CheckPoints", () => {

        it('Should not throw error for deleting checkpoints for undefined file', () => {
            assert.doesNotThrow(() => {
                vscode.commands.executeCommand('checkPointExplorer.deleteAllCheckPoints');
            });
        });

        it('Should clear global state for test file', async () => {
            await vscode.window.showTextDocument(vscode.Uri.file(testFilePath));
            vscode.commands.executeCommand('checkPointExplorer.deleteAllCheckPoints');
            assert.equal(dataStore[testFilePath], null);
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');


        });

        afterEach((done) => {
            if (existsSync(testFilePath)) {
                unlinkSync(testFilePath);
            }
            else {
                writeFileSync(testFilePath, "0");
            }
            done();
        });

    });

    describe("Delete single checkpoint", () => {

        before("Create file and make 3 checkpoints", async () => {
            writeFileSync(testFilePath, "0");
            await vscode.window.showTextDocument(vscode.Uri.file(testFilePath));
            await vscode.commands.executeCommand('checkPointExplorer.commenceTracking');
            const { activeTextEditor } = vscode.window;
            activeTextEditor?.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(0,1), "1");
            }).then(() => {
                console.log(activeTextEditor.document.getText());
                activeTextEditor.document.save();
            });

        });

        it('Should not throw error for deleting checkpoints for undefined file', () => {
            
        });

        after(() => {
            unlinkSync(testFilePath);
        });

    });

    after(() => {
        deactivate(context);
    });
});