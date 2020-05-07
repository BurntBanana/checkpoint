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
        await vscode.window.showTextDocument(vscode.Uri.file(testFilePath)).then(undefined, err => {console.error(err);});
        await checkPointProvider.updateCheckPointObject(new CheckPointObjectImpl(["0"], [new Date(Date.now())], "0", 0));

        const { activeTextEditor } = vscode.window;

        for (let i = 2; i <= checkpointLength; i++) {
            await activeTextEditor?.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(0, i - 1), (i - 1).toString());
            });
            await activeTextEditor?.document.save();
        }
        resolve(true);
    });
}

function appendCheckPoints(testFilePath: string, checkpointLength: number = 1) {
    return new Promise(async (resolve) => {
        await vscode.window.showTextDocument(vscode.Uri.file(testFilePath)).then(undefined, err => {console.error(err);});
        const { activeTextEditor } = vscode.window;
        for (let i = checkpointLength; i >= 1; i--) {
            await activeTextEditor?.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(0, 0), (i).toString());
            });
            await activeTextEditor?.document.save();
        }
        resolve(true);
    });
}


function generateFileByPatch(index: number, testFilePath: string, interval: number): Promise<string> {
    return new Promise((resolve, reject) => {

        const checkPointObject = (<CheckPointObject>dataStore[testFilePath]);
        const closestCheckPoint = (index: number) => (Math.floor(index / interval) * interval);
        const dmp = new diff_match_patch();

        if (checkPointObject.patches.length >= index) {

            let generatedFile: string = checkPointObject.patches[closestCheckPoint(index)] as string;

            for (let i = closestCheckPoint(index) + 1; i <= index; i++) {
                generatedFile = dmp.patch_apply(checkPointObject.patches[i] as patch_obj[], generatedFile)[0];
            }
            resolve(generatedFile);
        }
        else {
            reject(false);
        }
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

            await createCheckPoints(testFilePath, interval + 1);
            testFiles.push(testFilePath);

        });

        it('Should not create checkpoints if document is undefined', () => {
            const patchesLengthOld = (<CheckPointObject>dataStore[testFilePath]).patches.length;
            checkPointProvider.saveCheckPoint(<vscode.TextDocument><unknown>undefined);
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
            const { activeTextEditor } = vscode.window;
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

    describe('getChildren()', () => {

        const testFilePath = join(__dirname, "get_children_test.txt");
        const checkpointLength = 3;
        before('Create test file', async () => {

            await createCheckPoints(testFilePath, checkpointLength);
            testFiles.push(testFilePath);

        });

        it('Should return array of CheckPointTreeItems with length of checkpoints', async () => {
            // const checkPointObject = <CheckPointObject>dataStore[testFilePath];
            const checkPointTreeItems = await checkPointProvider.getChildren();
            assert(Array.isArray(checkPointTreeItems));
            assert.equal(checkPointTreeItems.length, checkpointLength);

        });

        after(async () => {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        });

    });

    describe('getTreeItem()', () => {

        const testFilePath = join(__dirname, "get_treeitem_test.txt");
        const checkpointLength = 3;
        const activeSvg = "garbage";
        const contextValue = "checkPointItem";

        before('Create test file', async () => {

            await createCheckPoints(testFilePath, checkpointLength);
            testFiles.push(testFilePath);

        });

        it('Should return CheckPointTreeItems', async () => {
            const checkPointTreeItems = await checkPointProvider.getChildren();
            const treeItem: vscode.TreeItem = checkPointProvider.getTreeItem(checkPointTreeItems[checkPointTreeItems.length - 1]);
            assert.equal(treeItem.contextValue, contextValue);
            assert((<string>treeItem.iconPath).includes(activeSvg));
        });

        after(async () => {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        });

    });

    describe('updateCheckPointObject()', () => {

        const testFilePath = join(__dirname, "update_checkpoint_test.txt");

        it('Should reject prommise for undefined file and set checkPointObject to empty', async () => {

            await assert.rejects(checkPointProvider.updateCheckPointObject({} as CheckPointObject));

        });

        it('Should clear file datastore if checkPointObject is empty', async () => {
            await createCheckPoints(testFilePath, 1);
            testFiles.push(testFilePath);

            await checkPointProvider.updateCheckPointObject({} as CheckPointObject);

            assert.deepStrictEqual((<CheckPointObject>dataStore[testFilePath]), null);
        });

        it('Should set file datastore to the value passed', async () => {

            const checkPointObject = new CheckPointObjectImpl(["1"], [new Date(Date.now())], "1", 1);
            await checkPointProvider.updateCheckPointObject(checkPointObject);

            assert.deepStrictEqual((<CheckPointObject>dataStore[testFilePath]), checkPointObject);
        });

        after(async () => {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        });

    });

    describe('deleteSingleCheckPoint()', () => {

        const testFilePath = join(__dirname, "delete_checkpoint_test.txt");
        const interval: number = vscode.workspace.getConfiguration("checkpoint").get("interval") || 4;

        before('Create test file', async () => {

            await createCheckPoints(testFilePath, 1);
            testFiles.push(testFilePath);

        });

        it('Should set file datastore to null if only checkpoint in view is deleted', async () => {

            await checkPointProvider.deleteSingleCheckPoint(0);
            assert.deepStrictEqual((<CheckPointObject>dataStore[testFilePath]), null);

        });

        it('Should update datastore if last checkpoint in view is deleted', async () => {
            const checkpointLength = 3;

            await createCheckPoints(testFilePath, checkpointLength);
            const previousFile = await generateFileByPatch(checkpointLength - 2, testFilePath, interval);
            await checkPointProvider.deleteSingleCheckPoint(checkpointLength - 1);
            const checkPointObject = (<CheckPointObject>dataStore[testFilePath]);
            assert.equal(checkPointObject.current, previousFile);

        });

        it('Should update datastore and set file checkpoint if file checkpoint in view is deleted', async () => {
            await appendCheckPoints(testFilePath, 1);
            const previousFile:string = await generateFileByPatch(1, testFilePath, interval);
            // console.log(<CheckPointObject>dataStore[testFilePath]);
            await checkPointProvider.deleteSingleCheckPoint(0);
            const checkPointObject = (<CheckPointObject>dataStore[testFilePath]);
            // console.log(checkPointObject);
            
            assert.deepStrictEqual(checkPointObject.patches[0], previousFile);

        });

        afterEach(async () => {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        });

    });



    after(() => {
        for (const testFile of testFiles) {
            unlinkSync(testFile);
        }
    });

});