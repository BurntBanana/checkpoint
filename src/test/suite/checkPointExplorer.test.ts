import * as assert from 'assert';
import { deactivate } from '../../extension';
import { ExtensionContext, ExtImpl, MemImpl, dataStore } from './createContext';
import { silenceLogs } from '../../logger';
import { CheckPointExplorer } from '../../CheckPointExplorer';
import * as vscode from 'vscode';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
import { CheckPointObject } from '../../Interfaces/CheckPointInterfaces';
import { CheckPointTreeItemImpl } from '../../checkPointProvider';
import { diff_match_patch, patch_obj } from 'diff-match-patch';

// const logPath = join(__dirname, "extension")
const context: ExtensionContext = new ExtImpl([], new MemImpl(), new MemImpl(), "test", "test", "test", __dirname);
let checkPointExplorer: CheckPointExplorer;

function createCheckPoints(testFilePath: string) {
    return new Promise(async (resolve) => {
        writeFileSync(testFilePath, "0");
        await vscode.window.showTextDocument(vscode.Uri.file(testFilePath));
        await vscode.commands.executeCommand('checkPointExplorer.commenceTracking');
        const { activeTextEditor } = vscode.window;
        await activeTextEditor?.edit(editBuilder => {
            editBuilder.insert(new vscode.Position(0, 1), "1");
        });
        await activeTextEditor?.document.save();
        await activeTextEditor?.edit(editBuilder => {
            editBuilder.insert(new vscode.Position(0, 2), "2");
        });
        await activeTextEditor?.document.save();
        resolve(true);
    });
}

describe('CheckPointExplorer', () => {

    const testFiles: Array<string> = [];

    before('Call constructor', () => {
        silenceLogs(true);
        checkPointExplorer = new CheckPointExplorer(context);
    });

    it('Should register commenceTracking, openCheckpoint, deleteSingle, deleteAll and setActive commands', () => {
        assert.equal(context.subscriptions.length, 5);
    });

    describe("Commence Tracking", () => {

        const testFilePath = join(__dirname, "commence_test.txt");

        before('Create test file', () => {
            writeFileSync(testFilePath, "0");
            testFiles.push(testFilePath);
        });

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
        });

        after(async () => {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

        });

    });

    describe("Delete All CheckPoints", () => {

        const testFilePath = join(__dirname, "delete_all_test.txt");

        before('Create test file', () => {
            writeFileSync(testFilePath, "0");
            testFiles.push(testFilePath);
        });

        it('Should not throw error for deleting checkpoints for undefined file', () => {
            assert.doesNotThrow(() => {
                vscode.commands.executeCommand('checkPointExplorer.deleteAllCheckPoints');
            });
        });

        it('Should clear global state for test file', async () => {
            await vscode.window.showTextDocument(vscode.Uri.file(testFilePath));
            vscode.commands.executeCommand('checkPointExplorer.deleteAllCheckPoints');
            assert.equal(dataStore[testFilePath], null);
        });

        after(async () => {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

        });
    });

    describe("Delete single checkpoint", () => {

        const testFilePath = join(__dirname, "delete_single_test.txt");
        let dmp: diff_match_patch;
        let documentText: string;

        before("Create file and make 3 checkpoints", async () => {
            await createCheckPoints(testFilePath);
            testFiles.push(testFilePath);
            dmp = new diff_match_patch();
            documentText = vscode.window.activeTextEditor?.document.getText() as string;
        });

        it('Should delete the checkpoint at specified index', async () => {
            const checkpoint = new CheckPointTreeItemImpl({} as Date, 1);
            await vscode.commands.executeCommand('checkPointExplorer.deleteCheckPoint', checkpoint);
            const checkPointObject: CheckPointObject = dataStore[vscode.window.activeTextEditor?.document.fileName as string] as CheckPointObject;

            const result: string = dmp.patch_apply(checkPointObject.patches[1] as patch_obj[], checkPointObject.patches[0] as string)[0];
            assert.equal(result, documentText);
        });

        after(async () => {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

        });

    });

    describe("Set active checkpoint", () => {

        const testFilePath = join(__dirname, "active_test.txt");
        let checkPointObject: CheckPointObject;
        const index: number = 1;

        before(async () => {
            await createCheckPoints(testFilePath);
            testFiles.push(testFilePath);

            const checkpoint = new CheckPointTreeItemImpl({} as Date, index);
            await vscode.commands.executeCommand('checkPointExplorer.setActiveCheckPoint', checkpoint);
            checkPointObject = dataStore[vscode.window.activeTextEditor?.document.fileName as string] as CheckPointObject;
        });

        it('Should set checkpoint at specified index as active in global state', () => {
            assert.equal(checkPointObject.active, index);

        });

        it('Should change file content to that at active checkpoint', () => {
            const fileText = readFileSync(testFilePath, 'utf8');
            assert.equal(fileText, "01");
        });

        after(async () => {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        });

    });

    describe("Open checkpoint", () => {
        const testFilePath = join(__dirname, "open_checkpoint_test.txt");
        const index: number = 1;
        let checkPointObject: CheckPointObject;

        before(async () => {
            await createCheckPoints(testFilePath);
            testFiles.push(testFilePath);

        });

        it('Should open checkpoint at index', async () => {
            await vscode.commands.executeCommand('checkPointExplorer.openCheckPoint', index);
            const editorText = vscode.window.activeTextEditor?.document.getText();
            assert.equal(editorText, "01");

        });

        it('Should create new checkpoint for unsaved changes', async () => {
            const { activeTextEditor } = vscode.window;

            await activeTextEditor?.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(0, 3), "3");
            });
            const currentText = activeTextEditor?.document.getText();

            await vscode.commands.executeCommand('checkPointExplorer.openCheckPoint', index);

            checkPointObject = dataStore[activeTextEditor?.document.fileName as string] as CheckPointObject;

            assert.equal(checkPointObject.patches.length, 4); //new checkpoint
            assert.equal(checkPointObject.current, currentText);
            assert.equal(checkPointObject.active, 3);

        });

        after(async () => {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        });

    });

    describe("Save checkpoint event", () => {
        const testFilePath = join(__dirname, "save_checkpoint_test.txt");
        let checkPointObject: CheckPointObject;

        before(async () => {
            writeFileSync(testFilePath, "0");
            testFiles.push(testFilePath);
            await vscode.window.showTextDocument(vscode.Uri.file(testFilePath));
            await vscode.commands.executeCommand('checkPointExplorer.commenceTracking');

        });

        it('Should not create checkpoint for clean file', async () => {

            const { activeTextEditor } = vscode.window;
            await activeTextEditor?.document.save();
            checkPointObject = dataStore[activeTextEditor?.document.fileName as string] as CheckPointObject;

            assert.equal(checkPointObject.patches.length, 1); //new checkpoint
            assert.equal(checkPointObject.current, activeTextEditor?.document.getText());
            assert.equal(checkPointObject.active, 0);

        });

        it('Should create checkpoint for dirty file', async () => {
            const { activeTextEditor } = vscode.window;
            await activeTextEditor?.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(0, 1), "1");
            });
            await activeTextEditor?.document.save();
            checkPointObject = dataStore[activeTextEditor?.document.fileName as string] as CheckPointObject;

            assert.equal(checkPointObject.patches.length, 2); //new checkpoint
            assert.equal(checkPointObject.current, activeTextEditor?.document.getText());
            assert.equal(checkPointObject.active, 1);

        });

        after(async () => {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        });
    });

    after(() => {
        deactivate(context);
        for (const testFile of testFiles) {
            unlinkSync(testFile);
        }
    });
});