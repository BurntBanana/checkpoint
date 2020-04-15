import * as vscode from 'vscode';
import {CheckPointObject, CheckPointTreeItem} from './Interfaces/CheckPointInterfaces';
import * as path from 'path';
import {diff_match_patch, patch_obj} from 'diff-match-patch';


class CheckPointTreeItemImpl implements CheckPointTreeItem {
    constructor (public timestamp: Date, public index: number) {
       
    }
}

//TreeViewImplementation
export class CheckPointProvider implements vscode.TreeDataProvider<CheckPointTreeItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<CheckPointTreeItem>;
    onDidChangeTreeData: vscode.Event<CheckPointTreeItem>;
    private checkPointContext: vscode.ExtensionContext;
    private checkPointObject: CheckPointObject; 
    
    constructor(context: vscode.ExtensionContext) {
        //update TreeView event
        this._onDidChangeTreeData = new vscode.EventEmitter<CheckPointTreeItem>();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.checkPointContext = context;
        let fileName = vscode.window.activeTextEditor?.document.fileName || "";
        this.checkPointObject = this.checkPointContext.globalState.get(fileName, {} as CheckPointObject);
        //On file save
        vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {	
            this.saveCheckPoint(document);
        });

        //on Active editor switch
        vscode.window.onDidChangeActiveTextEditor((document) => {
            this.activeEditorChange();
        });
    }
    
    private saveCheckPoint(document: vscode.TextDocument) {
        // if(!context.globalState.get(document.fileName)) {
		// 	let value: PatchObject = {
		// 		patches:[],
		// 		current: document.getText()
		// 	};
		// 	console.log("First save");
		// 	context.globalState.update(document.fileName, value);
		// }
		// else {
		// 	console.log("patching");
		// 	//context.globalState.update(document.fileName, "");
		// 	const dmp = new diff_match_patch();
		// 	let value = context.globalState.get(document.fileName, {} as PatchObject);
			
		// 	console.log(value.current);
		// 	let file1 = value.current;
		// 	let file2 = document.getText();
		// 	console.log(file2);

		// 	let patch:patch_obj[] = dmp.patch_make(file2, file1);
		// 	value.patches.push(patch);
		// 	value.current = file2;
        //     context.globalState.update(document.fileName, value);
        // }
    }

    private activeEditorChange() {

    }
    
    async getChildren(element?: CheckPointTreeItem): Promise<CheckPointTreeItem[]> {
        let result: Array<CheckPointTreeItem> = [];
        if (Object.keys(this.checkPointObject).length === 0) {
            return result;
        }
        else {
            for (let i = 0; i < this.checkPointObject.patches.length; i++) {
                let treeItem:CheckPointTreeItem = new CheckPointTreeItemImpl(this.checkPointObject.timestamps[i], i);
                result.push(treeItem);
            }
        }
        return result;
    }
    getTreeItem(element: CheckPointTreeItem): vscode.TreeItem {
        console.log("Called get item for", element);
        const treeItem = new vscode.TreeItem(element.timestamp.toLocaleString());
        let resourcePath: string = path.join(__filename, '..', '..', 'resources','/checkPointIcon.svg');
        treeItem.iconPath = {light: resourcePath, dark: resourcePath};
		treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
		return treeItem;

    }
}


export class CheckPointExplorer {
    private checkPointExplorer: vscode.TreeView<CheckPointTreeItem>;
    constructor(context: vscode.ExtensionContext) {
        console.log("CheckPoint constructor");
        const treeDataProvider = new CheckPointProvider(context);
        this.checkPointExplorer = vscode.window.createTreeView('checkPointExplorer', { treeDataProvider });
    }
}