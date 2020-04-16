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
    private interval: number;

    private closestCheckPoint = (index : number) => {
        return (Math.ceil(index/this.interval) * this.interval);
    };
    
    constructor(context: vscode.ExtensionContext, currentFileCheckPointObject: CheckPointObject) {
        //update TreeView event
        this._onDidChangeTreeData = new vscode.EventEmitter<CheckPointTreeItem>();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.checkPointContext = context;
        this.checkPointObject = currentFileCheckPointObject;
        this.interval = vscode.workspace.getConfiguration("checkpoint").get("interval") || 4;
    }

    public openCheckPoint(index: number) {

        const dmp = new diff_match_patch();
        let generatedFile:string;
        let patchIndex:number;
        // console.log(index);
        if (this.checkPointObject.patches.length < this.closestCheckPoint(index)) {
            generatedFile = this.checkPointObject.current as string;
            patchIndex = this.checkPointObject.patches.length - 1;
        }
        else {
            generatedFile = this.checkPointObject.patches[this.closestCheckPoint(index)] as string;
            patchIndex = this.closestCheckPoint(index) - 1;
        }
        if(index !== patchIndex)
        {
            for(let i = patchIndex; i > index; i--) {
                generatedFile = dmp.patch_apply(this.checkPointObject.patches[i] as patch_obj[], generatedFile)[0];
            }
        }
        console.log(generatedFile);
    }
    
    public saveCheckPoint(document: vscode.TextDocument) {
       
        const currentFile : string = document.getText();

        //check whether to store patch or file
        if (this.checkPointObject.patches.length % this.interval === 0) {
            this.checkPointObject.patches.push(currentFile);
        }
        else {
            const dmp = new diff_match_patch();
            let previousFile = this.checkPointObject.current;
            let patch:patch_obj[] = dmp.patch_make(currentFile, previousFile);
            this.checkPointObject.patches.push(patch);
        }

        this.checkPointObject.current = currentFile;
        this.checkPointObject.timestamps.push(new Date(Date.now()));
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
        const treeItem = new vscode.TreeItem(element.timestamp.toLocaleString());
        let resourcePath: string = path.join(__filename, '..', '..', 'resources','/checkPointIcon.svg');
        treeItem.contextValue = "checkPointItem";
        treeItem.iconPath = {light: resourcePath, dark: resourcePath};
        treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
        // console.log(element.index);
        treeItem.command = { command: 'checkPointExplorer.openFile', title: "Open File", arguments: [element.index], };
		return treeItem;

    }
    updateCheckPointObject(checkPointObject: CheckPointObject) {
        this.checkPointObject = checkPointObject;
        this._onDidChangeTreeData.fire();
    }
}


export class CheckPointExplorer {
    private checkPointTreeView: vscode.TreeView<CheckPointTreeItem> | undefined = undefined;
    private checkPointExplorerContext: vscode.ExtensionContext;
    private treeDataProvider: CheckPointProvider | undefined = undefined;

    constructor(context: vscode.ExtensionContext) {
        // console.log("CheckPoint constructor");
        this.checkPointExplorerContext = context;
        
        this.createDataProvider(false);
        vscode.commands.registerCommand('checkPointExplorer.commenceTracking', () => this.createDataProvider(true));
        vscode.commands.registerCommand('checkPointExplorer.openFile', (index) => this.openProviderCheckPoint(index));
        vscode.commands.registerCommand('checkPointExplorer.deleteAllCheckPoints', () => this.deleteCheckPoints());

        
        
        //on Active editor switch
        vscode.window.onDidChangeActiveTextEditor((documentEditor : vscode.TextEditor | undefined) => {
            this.activeEditorChange(documentEditor);
        });

        //On file save
        vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {	
            this.savedDocument(document);
        });
        
    }

    private deleteCheckPoints() {
        this.checkPointExplorerContext.globalState.update(vscode.window.activeTextEditor?.document.fileName as string, null);
        //this.createDataProvider(false);
        this.treeDataProvider?.updateCheckPointObject({} as CheckPointObject);
    }
    private openProviderCheckPoint(index: number) {
        this.treeDataProvider?.openCheckPoint(index);
    }

    private activeEditorChange(textEditor : vscode.TextEditor | undefined) {
        if (textEditor) {
            this.createDataProvider(false);
        }
        
    }

    private savedDocument(textDocument : vscode.TextDocument | undefined) {
        if (textDocument && this.treeDataProvider) {
            this.treeDataProvider?.saveCheckPoint(textDocument);
        }
    }


    private createDataProvider(initialise : boolean){
        this.treeDataProvider = undefined;
        this.checkPointTreeView = undefined;
        let current_document : vscode.TextDocument | undefined = vscode.window.activeTextEditor?.document;
        let currentFileCheckPointObject = this.checkPointExplorerContext.globalState.get(current_document?.fileName || "") || undefined;
        
        if(!currentFileCheckPointObject){
            if(initialise){
                currentFileCheckPointObject = new CheckPointObjectImpl([current_document?.getText() as string], [new Date(Date.now())], current_document?.getText() as string);
                this.checkPointExplorerContext.globalState.update(current_document?.fileName as string, currentFileCheckPointObject);
                
            }
            else{
                currentFileCheckPointObject = {} as CheckPointObject;
            }
        }
        this.treeDataProvider = new CheckPointProvider(this.checkPointExplorerContext, currentFileCheckPointObject as CheckPointObject);
        this.checkPointTreeView = vscode.window.createTreeView('checkPointExplorer', { treeDataProvider:this.treeDataProvider });
    }
}   