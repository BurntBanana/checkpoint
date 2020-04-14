import * as vscode from 'vscode';


//TreeViewImplementation
export class CheckPointProvider implements vscode.TreeDataProvider<number> {
    
    //update TreeView event
    _onDidChangeTreeData: vscode.EventEmitter<number> = new vscode.EventEmitter<number>();
    onDidChangeTreeData: vscode.Event<number> = this._onDidChangeTreeData.event;
    
    //On file save
    saveEvent = vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {	
        //todo check save as 
    });

    //on Active editor switch
    activeEditorChangeEvent = vscode.window.onDidChangeActiveTextEditor((document) => {
		console.log(document);
    });
    
    async getChildren(element?: number): Promise<number[]> {
        return this.test_var.patches.map((x, i) => i);
    }
    getTreeItem(element: number): vscode.TreeItem {
        console.log("Called get item for", element);
        const treeItem = new vscode.TreeItem(element);
        treeItem.label = String(this.test_var.patches[element.valueOf()])
        treeItem.iconPath = {light: path.join(__filename, '..', '..', 'resources','/dot.svg'), dark: path.join(__filename, '..', '..', 'resources','/dot.svg')};
		treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
		return treeItem;

    }
}


export class CheckPointExplorer {
    private checkPointExplorer: vscode.TreeView<number>;
    constructor(context: vscode.ExtensionContext) {
        const treeDataProvider = new CheckPointProvider();
        this.checkPointExplorer = vscode.window.createTreeView('checkPointExplorer', { treeDataProvider });
    }
}