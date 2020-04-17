import * as vscode from 'vscode';
import {CheckPointObject, CheckPointTreeItem} from './Interfaces/CheckPointInterfaces';
import * as path from 'path';
import {diff_match_patch, patch_obj} from 'diff-match-patch';
import * as dateFormat from 'dateformat';

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
    private checkPointSelected : boolean;

    private closestCheckPoint = (index : number) => {
        return (Math.floor(index/this.interval) * this.interval);
    };
    
    constructor(context: vscode.ExtensionContext, currentFileCheckPointObject: CheckPointObject) {
        //update TreeView event
        this._onDidChangeTreeData = new vscode.EventEmitter<CheckPointTreeItem>();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.checkPointContext = context;
        this.checkPointObject = currentFileCheckPointObject;
        this.interval = vscode.workspace.getConfiguration("checkpoint").get("interval") || 4;
        this.checkPointSelected = false;
    }
    private editorTest(checkPointData : string) {

    
        const { activeTextEditor } = vscode.window;
        // activeTextEditor?.edit(builder => {
        //     const { document } = activeTextEditor;
        //     let total_lines = document.lineCount;
        //     let last_char = document.getWordRangeAtPosition(new vscode.Position(total_lines, 0))?.end.character;
        //     let currentRange = new vscode.Range(new vscode.Position(0,0), new vscode.Position(total_lines,last_char as number))
        //     builder.replace(currentRange, checkPointData);
        // });
        if (activeTextEditor) {
            const { document } = activeTextEditor;
            if (document) {
                const textEdits: vscode.TextEdit[] = [];
                let total_lines = document.lineCount;
                let last_char = document.lineAt(total_lines - 1).rangeIncludingLineBreak.end.character;                
                let test_rng: vscode.Range = new vscode.Range(new vscode.Position(0,0), new vscode.Position(total_lines,last_char as number));
                textEdits.push(vscode.TextEdit.delete(test_rng));
                textEdits.push(vscode.TextEdit.insert(new vscode.Position(0,0), checkPointData));
                const workEdits = new vscode.WorkspaceEdit();
                workEdits.set(document.uri, textEdits); // give the edits
                vscode.workspace.applyEdit(workEdits); // apply the edits
            }
            this.checkPointSelected = true;
        }
    }

    public openCheckPoint(index: number) {

        //if file is unsaved, make checkpoint and proceeed
        this.saveCheckPoint(vscode.window.activeTextEditor?.document as vscode.TextDocument, this.checkPointSelected);

        const dmp = new diff_match_patch();
        let generatedFile:string;
        let patchIndex:number;

        patchIndex = this.closestCheckPoint(index) + 1;
        generatedFile = this.checkPointObject.patches[this.closestCheckPoint(index)] as string;
        
        for(let i = patchIndex; i <= index; i++) {
            generatedFile = dmp.patch_apply(this.checkPointObject.patches[i] as patch_obj[], generatedFile)[0];
        }
        this.editorTest(generatedFile);


    }
    
    public saveCheckPoint(document: vscode.TextDocument, check: boolean = false) {

        const currentFile : string = document.getText();
        console.log(currentFile);
        let previousFile = this.checkPointObject.current;
        console.log(previousFile);
        //if both files are same
        if (check || currentFile === previousFile) {
            return;
        }
        else {
            this.checkPointSelected = false;
        }
       
        //check whether to store patch or file
        if (this.checkPointObject.patches.length % this.interval === 0) {
            this.checkPointObject.patches.push(currentFile);
        }
        else {

            const dmp = new diff_match_patch();
            let previousFile = this.checkPointObject.current;
            let patch:patch_obj[] = dmp.patch_make(previousFile, currentFile);
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
        const treeItem = new vscode.TreeItem(dateFormat(element.timestamp));
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

        vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {	
            if(this.treeDataProvider) {
                this.treeDataProvider.saveCheckPoint(document);
            }
            
        });
        
        //on Active editor switch
        vscode.window.onDidChangeActiveTextEditor((documentEditor : vscode.TextEditor | undefined) => {
            this.activeEditorChange(documentEditor);
        });

        //On file save
        // vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {	
        //     this.savedDocument(document);
        // });
        
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

    // private savedDocument(textDocument : vscode.TextDocument | undefined) {
    //     console.log("called");
    //     if (textDocument && this.treeDataProvider) {
    //         this.treeDataProvider?.saveCheckPoint(textDocument);
    //     }
    // }
    

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