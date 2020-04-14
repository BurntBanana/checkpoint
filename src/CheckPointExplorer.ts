import * as vscode from 'vscode';
import {CheckPointObject, CheckPointTreeItem} from './Interfaces/CheckPointInterfaces'
import * as path from 'path';

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
            this.saveCheckPoint();
        });

        //on Active editor switch
        vscode.window.onDidChangeActiveTextEditor((document) => {
            this.activeEditorChange();
        });
    }
    
    private saveCheckPoint() {

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
        const treeDataProvider = new CheckPointProvider(context);
        this.checkPointExplorer = vscode.window.createTreeView('checkPointExplorer', { treeDataProvider });
    }
}