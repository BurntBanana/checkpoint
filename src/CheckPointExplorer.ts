import * as vscode from 'vscode';
import {CheckPointObject, CheckPointTreeItem} from './Interfaces/CheckPointInterfaces';
import * as path from 'path';
import {diff_match_patch, patch_obj} from 'diff-match-patch';


class CheckPointTreeItemImpl implements CheckPointTreeItem {
    constructor (public timestamp: Date, public index: number) {}
}
class CheckPointObjectImpl implements CheckPointObject {
    constructor (public patches: Array<patch_obj[]|string>, public timestamps: Array<Date>, public current: string) {}
}

//TreeViewImplementation
export class CheckPointProvider implements vscode.TreeDataProvider<CheckPointTreeItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<CheckPointTreeItem>;
    onDidChangeTreeData: vscode.Event<CheckPointTreeItem>;
    private checkPointContext: vscode.ExtensionContext;
    private checkPointObject: CheckPointObject; 
    
    constructor(context: vscode.ExtensionContext, currentFileCheckPointObject: CheckPointObject) {
        //update TreeView event
        this._onDidChangeTreeData = new vscode.EventEmitter<CheckPointTreeItem>();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.checkPointContext = context;
        this.checkPointObject = currentFileCheckPointObject;
    
        //On file save
        vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {	
            this.saveCheckPoint(document);
        });
    }
    
    private saveCheckPoint(document: vscode.TextDocument) {
        console.log("patching");
        //context.globalState.update(document.fileName, "");
        const dmp = new diff_match_patch();
        
        console.log(this.checkPointObject.current);
        let previoustFile = this.checkPointObject.current;
        let currentFile = document.getText();
        console.log(currentFile);

        let patch:patch_obj[] = dmp.patch_make(currentFile, previoustFile);
        
        this.checkPointObject.patches.push(patch);
        this.checkPointObject.timestamps.push(new Date(Date.now()))
        this.checkPointObject.current = currentFile;
        
        this.checkPointContext.globalState.update(document.fileName, this.checkPointObject);
        this._onDidChangeTreeData.fire();
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
    private checkPointExplorer: vscode.TreeView<CheckPointTreeItem> | undefined;
    private checkPointExplorerContext: vscode.ExtensionContext;


    constructor(context: vscode.ExtensionContext) {
        console.log("CheckPoint constructor");
        this.checkPointExplorerContext = context;
        let currentFileCheckPointObject = context.globalState.get(vscode.window.activeTextEditor?.document.fileName || "") || undefined;
        //check if file already has checkPointObject
        this.initCheckPointExplorer(currentFileCheckPointObject as CheckPointObject | undefined);

        vscode.commands.registerCommand('checkPointExplorer.commenceTracking', () => this.init());
        //on Active editor switch
        vscode.window.onDidChangeActiveTextEditor((document : vscode.TextEditor | undefined) => {
            this.activeEditorChange(document);
        });
    }
    initCheckPointExplorer(currentFileCheckPointObject : CheckPointObject | undefined) {
        if (currentFileCheckPointObject) {
            const treeDataProvider = new CheckPointProvider(this.checkPointExplorerContext, currentFileCheckPointObject as CheckPointObject);
            this.checkPointExplorer = vscode.window.createTreeView('checkPointExplorer', { treeDataProvider });
        }
        else {
            const treeDataProvider = new CheckPointProvider(this.checkPointExplorerContext, {} as CheckPointObject);
            this.checkPointExplorer = vscode.window.createTreeView('checkPointExplorer', { treeDataProvider });
            
        }
    }
    //initialise treedataprovider and create view
    init() {    
        console.log("First save");
        let document : vscode.TextDocument | undefined = vscode.window.activeTextEditor?.document;
        if(document) {
            let value: CheckPointObject = new CheckPointObjectImpl([document?.getText() as string], [new Date(Date.now())], document?.getText() as string);
            this.checkPointExplorerContext.globalState.update(document.fileName, value);
            const treeDataProvider = new CheckPointProvider(this.checkPointExplorerContext, value);
            this.checkPointExplorer = vscode.window.createTreeView('checkPointExplorer', { treeDataProvider });
        }  
    }
    private activeEditorChange(textEditor : vscode.TextEditor | undefined) {
        if (textEditor) {
            let currentFileCheckPointObject = this.checkPointExplorerContext.globalState.get(textEditor.document.fileName || "") || undefined;
            this.initCheckPointExplorer(currentFileCheckPointObject as CheckPointObject | undefined);
            
        }
        
    }
}   