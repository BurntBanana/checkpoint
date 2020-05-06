import * as assert from 'assert';
import { deactivate } from '../../extension';
import { ExtensionContext, ExtImpl, MemImpl, dataStore } from './createContext';
import { CheckPointObject, CheckPointTreeItem } from '../..//Interfaces/checkPointInterfaces';
import { logger, silenceLogs } from '../../logger';
import { CheckPointExplorer } from '../../checkPointExplorer';
import * as vscode from 'vscode';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
import { CheckPointTreeItemImpl, CheckPointProvider, CheckPointObjectImpl } from '../../checkPointProvider';
import { diff_match_patch, patch_obj } from 'diff-match-patch';

const context: ExtensionContext = new ExtImpl([], new MemImpl(), new MemImpl(), "test", "test", "test", __dirname);
let checkPointProvider: CheckPointProvider;

function createCheckPoints(testFilePath: string, checkpointLength: number = 1) {
    return new Promise(async (resolve) => {
        
        writeFileSync(testFilePath, "0");
        await vscode.window.showTextDocument(vscode.Uri.file(testFilePath));
        await checkPointProvider.updateCheckPointObject(new CheckPointObjectImpl(["0"], [new Date(Date.now())], "0", 0));
        const { activeTextEditor } = vscode.window;

        for (let i = 2; i <= checkpointLength; i++) {
            await activeTextEditor?.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(0, i-1), (i-1).toString());
            });
            await activeTextEditor?.document.save();
        }
        resolve(true);
    });
}




describe('CheckPointProvider', () => {

    const testFiles: Array<string> = [];

    before(() => { 
        const currentFileCheckPointObject = {} as CheckPointObject;
        checkPointProvider = new CheckPointProvider(context, currentFileCheckPointObject);
        vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
            checkPointProvider.saveCheckPoint(document);
        });

    });

    describe('openCheckPoint()', () => {

        const testFilePath = join(__dirname, "open_test.txt");

        before('Create test file', async () => {
            await createCheckPoints(testFilePath, 3);
            testFiles.push(testFilePath);
        });

        it('Should open checkpoint at given index', async () => {
            await checkPointProvider.openCheckPoint(1);
            assert.equal(vscode.window.activeTextEditor?.document.getText(), "01");
        });

        it('Should throw error if index is out of range', async () => {
            await checkPointProvider.openCheckPoint(5).catch(value => assert.equal(value, false));
        });

        after(async () => {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        });
    });

    describe('saveCheckPoint()', () => {

        const testFilePath = join(__dirname, "save_test.txt");
        const interval: number = vscode.workspace.getConfiguration("checkpoint").get("interval") || 4;

        before('Create test file', async () => {

            await createCheckPoints(testFilePath, interval+1);
            testFiles.push(testFilePath);

        });

        it('Should not create checkpoints if document is undefined', () => {
            const patchesLengthOld = (<CheckPointObject>dataStore[testFilePath]).patches.length;
            checkPointProvider.saveCheckPoint(undefined as unknown as vscode.TextDocument);
            const patchesLengthNew = (<CheckPointObject>dataStore[testFilePath]).patches.length;

            assert.equal(patchesLengthNew, patchesLengthOld);
        });

        it('Should not create checkpoint if there are no unsaved changes', async () => {
            const patchesLengthOld = (<CheckPointObject>dataStore[testFilePath]).patches.length;
            checkPointProvider.saveCheckPoint(vscode.window.activeTextEditor?.document as vscode.TextDocument);
            const patchesLengthNew = (<CheckPointObject>dataStore[testFilePath]).patches.length;

            assert.equal(patchesLengthNew, patchesLengthOld);
        });

        it('Should save file content at the interval defined', async () => {
            const {activeTextEditor} = vscode.window;
            checkPointProvider.saveCheckPoint(vscode.window.activeTextEditor?.document as vscode.TextDocument);
            const patchAtInterval = (<CheckPointObject>dataStore[testFilePath]).patches[interval];

            assert(typeof patchAtInterval === "string");
        });

        it('Should not create checkpoint if file at index is set active with no unsaved changes', async () => {
            const patchesLengthOld = (<CheckPointObject>dataStore[testFilePath]).patches.length;
            checkPointProvider.setActiveCheckPoint(3);
            const patchesLengthNew = (<CheckPointObject>dataStore[testFilePath]).patches.length;

            assert.equal(patchesLengthNew, patchesLengthOld);

        });

        after(async () => {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        });

    });

    after(() => {
        for (const testFile of testFiles) {
            unlinkSync(testFile);
        }
    });

});