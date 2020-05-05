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

function createCheckPoints(testFilePath: string) {
    return new Promise(async (resolve) => {
        writeFileSync(testFilePath, "0");
        await vscode.window.showTextDocument(vscode.Uri.file(testFilePath));
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




describe('CheckPointProvider', () => {

    const testFiles: Array<string> = [];


    before(() => {
        const currentFileCheckPointObject = new CheckPointObjectImpl(["0"], [new Date(Date.now())], "0", 0);
        checkPointProvider = new CheckPointProvider(context, currentFileCheckPointObject);
        checkPointProvider.updateCheckPointObject(currentFileCheckPointObject as CheckPointObject);
        vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
            checkPointProvider.saveCheckPoint(document);
        });

    });

    describe('openCheckPoint()', () => {

        const testFilePath = join(__dirname, "open_test.txt");

        before('Create test file', async () => {
            await createCheckPoints(testFilePath);
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

    after(() => {
        for (const testFile of testFiles) {
            unlinkSync(testFile);
        }
    });
});