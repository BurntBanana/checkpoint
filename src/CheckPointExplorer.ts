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
        if (this.checkPointObject.patches.length < this.interval) {
            generatedFile = this.checkPointObject.current as string;
            patchIndex = this.checkPointObject.patches.length - 1;
        }
        else {
            generatedFile = this.checkPointObject.patches[this.closestCheckPoint(index)] as string;
            patchIndex = this.closestCheckPoint(index) - 1;
        }
        if(index !== patchIndex)
        {
            for(let i = patchIndex; i >= index; i--) {
                generatedFile = dmp.patch_apply(this.checkPointObject.patches[i] as patch_obj[], generatedFile)[0];
            }
        }
        console.log(generatedFile);
    }
    
    public saveCheckPoint(document: vscode.TextDocument) {
        // console.log("patching");
        //context.globalState.update(document.fileName, "");
        const dmp = new diff_match_patch();
        
        // console.log(this.checkPointObject.current);
        let previoustFile = this.checkPointObject.current;
        let currentFile = document.getText();
        // console.log(currentFile);

        let patch:patch_obj[] = dmp.patch_make(currentFile, previoustFile);
        
        this.checkPointObject.patches.push(patch);
        this.checkPointObject.timestamps.push(new Date(Date.now()));
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
        const treeItem = new vscode.TreeItem(element.timestamp.toLocaleString());
        let resourcePath: string = path.join(__filename, '..', '..', 'resources','/checkPointIcon.svg');
        treeItem.contextValue = "checkPointItem";
        treeItem.iconPath = {light: resourcePath, dark: resourcePath};
        treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
        // console.log(element.index);
        treeItem.command = { command: 'checkPointExplorer.openFile', title: "Open File", arguments: [element.index], };
		return treeItem;

    }
}


export class CheckPointExplorer {
    private checkPointTreeView: vscode.TreeView<CheckPointTreeItem> | undefined = undefined;
    private checkPointExplorerContext: vscode.ExtensionContext;
    private treeDataProvider: CheckPointProvider | undefined = undefined;

    constructor(context: vscode.ExtensionContext) {
        // console.log("CheckPoint constructor");
        this.checkPointExplorerContext = context;
        
        // let currentFileCheckPointObject = context.globalState.get(vscode.window.activeTextEditor?.document.fileName || "") || undefined;
        //check if file already has checkPointObject
        // this.initCheckPointExplorer(currentFileCheckPointObject as CheckPointObject | undefined);
        
        this.createDataProvider(false);
        vscode.commands.registerCommand('checkPointExplorer.commenceTracking', () => this.createDataProvider(true));
        vscode.commands.registerCommand('checkPointExplorer.openFile', (index) => this.openProviderCheckPoint(index));
        
        //on Active editor switch
        vscode.window.onDidChangeActiveTextEditor((documentEditor : vscode.TextEditor | undefined) => {
            this.activeEditorChange(documentEditor);
        });

        //On file save
        vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {	
            this.savedDocument(document);
        });
        
    }
    private openProviderCheckPoint(index: number) {
        this.treeDataProvider?.openCheckPoint(index);
    }

    // private initCheckPointExplorer(currentFileCheckPointObject : CheckPointObject | undefined) {
    //     if (currentFileCheckPointObject) {
    //         this.treeDataProvider = new CheckPointProvider(this.checkPointExplorerContext, currentFileCheckPointObject as CheckPointObject);
    //         this.checkPointExplorer = vscode.window.createTreeView('checkPointExplorer', { treeDataProvider:this.treeDataProvider});
    //     }
    //     else {
    //         this.treeDataProvider = new CheckPointProvider(this.checkPointExplorerContext, {} as CheckPointObject);
    //         this.checkPointExplorer = vscode.window.createTreeView('checkPointExplorer', { treeDataProvider:this.treeDataProvider });
            
    //     }
    // }
    //initialise treedataprovider and create view
    // private init() {    
    //     //console.log("First save");
    //     let document : vscode.TextDocument | undefined = vscode.window.activeTextEditor?.document;
    //     if(document) {
    //         let value: CheckPointObject = new CheckPointObjectImpl([document?.getText() as string], [new Date(Date.now())], document?.getText() as string);
    //         this.checkPointExplorerContext.globalState.update(document.fileName, value);
    //         this.treeDataProvider = new CheckPointProvider(this.checkPointExplorerContext, value);
    //         this.checkPointExplorer = vscode.window.createTreeView('checkPointExplorer', { treeDataProvider:this.treeDataProvider });
    //     }  
    // }

    private activeEditorChange(textEditor : vscode.TextEditor | undefined) {
        if (textEditor) {
            // let currentFileCheckPointObject = this.checkPointExplorerContext.globalState.get(textEditor.document.fileName || "") || undefined;
            // this.initCheckPointExplorer(currentFileCheckPointObject as CheckPointObject | undefined);
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
            }
            else{
                currentFileCheckPointObject = {} as CheckPointObject;
            }
        }
        this.treeDataProvider = new CheckPointProvider(this.checkPointExplorerContext, currentFileCheckPointObject as CheckPointObject);
        this.checkPointTreeView = vscode.window.createTreeView('checkPointExplorer', { treeDataProvider:this.treeDataProvider });
    }
}   