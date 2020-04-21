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
        const dmp = new diff_match_patch();
        const document = vscode.window.activeTextEditor?.document;
        //if file is unsaved, make checkpoint and proceeed
        if (document) {
            this.saveCheckPoint(vscode.window.activeTextEditor?.document as vscode.TextDocument, this.checkPointSelected);
            this.editorTest(this.generateFileByPatch(index));
        }
    }

    public saveCheckPoint(document: vscode.TextDocument, check: boolean = false) {

        //check for save as
        if (vscode.window.activeTextEditor?.document.fileName !== document.fileName) {
            return;
        }

        const currentFile : string = document.getText();
        let previousFile = this.checkPointObject.current;

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
        //this.checkPointContext.globalState.update(document.fileName, this.checkPointObject);
        //this._onDidChangeTreeData.fire();
        this.updateCheckPointObject(this.checkPointObject);
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
        //if empty object
        if (Object.keys(checkPointObject).length === 0) {
            this.checkPointContext.globalState.update(vscode.window.activeTextEditor?.document.fileName || "", null);
        }
        else {
            this.checkPointContext.globalState.update(vscode.window.activeTextEditor?.document.fileName || "", checkPointObject);
        }
        this.checkPointObject = checkPointObject;
        this._onDidChangeTreeData.fire();
    }

    deleteSingleCheckPoint(index : number){
        const dmp = new diff_match_patch();
        let generatedFile : string = "";

        //only one checkpoint
        if (this.checkPointObject.patches.length === 1 && index === 0) {
            this.updateCheckPointObject({} as CheckPointObject);
            return;
        }
        //last element deleted
        if(index === this.checkPointObject.patches.length - 1){
            this.checkPointObject.current = this.generateFileByPatch(index -1);
        }
        else if(index === this.closestCheckPoint(index)){
            generatedFile = this.checkPointObject.patches[index] as string;
        }
        else {
            generatedFile = this.generateFileByPatch(index - 1);
            this.checkPointObject.patches[index + 1] = dmp.patch_make(generatedFile, this.generateFileByPatch(index + 1));
        }
        this.checkPointObject.patches.splice(index, 1);
        this.checkPointObject.timestamps.splice(index, 1);
        // console.log(generatedFile);

        for(let k = index; k < this.checkPointObject.patches.length; k++){
            if(k === this.closestCheckPoint(k)){
                this.checkPointObject.patches[k] = dmp.patch_apply(this.checkPointObject.patches[k] as patch_obj[], generatedFile)[0];
            }
            else if(k === this.closestCheckPoint(k+1) -1){
                this.checkPointObject.patches[k] = dmp.patch_make(generatedFile, this.checkPointObject.patches[k] as string);
            }
            generatedFile = this.generateFileByPatch(k);
            // console.log(generatedFile);
        }
        // this._onDidChangeTreeData.fire();
        //this.checkPointContext.globalState.update(vscode.window.activeTextEditor?.document.fileName as string, this.checkPointObject);
        this.updateCheckPointObject(this.checkPointObject);
        // console.log(generateFileByPatch(patches, interval, patches.length - 1));
    }

    private generateFileByPatch(index : number) : string {
        const dmp = new diff_match_patch();
        let generatedFile : string = this.checkPointObject.patches[this.closestCheckPoint(index)] as string;
        for(let i = this.closestCheckPoint(index) + 1; i<= index; i++){
            // generatedFile = applyPatch(generatedFile, patches[i]);
            generatedFile = dmp.patch_apply(this.checkPointObject.patches[i] as patch_obj[], generatedFile)[0];
        }
        return generatedFile;
    }
}


export class CheckPointExplorer {
    private checkPointTreeView: vscode.TreeView<CheckPointTreeItem> | undefined = undefined;
    private checkPointExplorerContext: vscode.ExtensionContext;
    private treeDataProvider: CheckPointProvider | undefined = undefined;

    constructor(context: vscode.ExtensionContext) {
        // console.log("CheckPoint constructor");
        this.checkPointExplorerContext = context;
        
        this.createDataProvider();
        vscode.commands.registerCommand('checkPointExplorer.commenceTracking', () => this.commenceTracking());
        vscode.commands.registerCommand('checkPointExplorer.openFile', (index) => this.openProviderCheckPoint(index));
        vscode.commands.registerCommand('checkPointExplorer.deleteAllCheckPoints', () => this.deleteCheckPoints());
        vscode.commands.registerCommand('checkPointExplorer.deleteCheckPoint', (element) => this.deleteSingleCheckPoint(element));
        vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {	
            if(this.treeDataProvider) {
                this.treeDataProvider.saveCheckPoint(document);
            }
            
        });
        
        //on Active editor switch
        vscode.window.onDidChangeActiveTextEditor((documentEditor : vscode.TextEditor | undefined) => {
            this.activeEditorChange(documentEditor);
        });
        
    }

    private deleteSingleCheckPoint(element : CheckPointTreeItem) {
       if(this.treeDataProvider){
           this.treeDataProvider?.deleteSingleCheckPoint(element.index);
       }
    }

    private deleteCheckPoints() {
        this.treeDataProvider?.updateCheckPointObject({} as CheckPointObject);
    }
    private openProviderCheckPoint(index: number) {
        this.treeDataProvider?.openCheckPoint(index);
    }

    private activeEditorChange(textEditor : vscode.TextEditor | undefined) {
        if (textEditor) {
            let currentFileCheckPointObject = this.checkPointExplorerContext.globalState.get(textEditor.document.fileName || "") || {} as CheckPointObject;
            this.treeDataProvider?.updateCheckPointObject(currentFileCheckPointObject as CheckPointObject)
            //this.createDataProvider(false);
        }
        
    }
    private commenceTracking() {
        const currentDocumentText : string | undefined = vscode.window.activeTextEditor?.document.getText();
        if (currentDocumentText) {
            let currentFileCheckPointObject = new CheckPointObjectImpl([currentDocumentText as string], [new Date(Date.now())], currentDocumentText as string);
            this.treeDataProvider?.updateCheckPointObject(currentFileCheckPointObject as CheckPointObject);
        }
    }

    private createDataProvider(){
        let current_document : vscode.TextDocument | undefined = vscode.window.activeTextEditor?.document;
        let currentFileCheckPointObject = this.checkPointExplorerContext.globalState.get(current_document?.fileName || "") || undefined;
        
        if(!currentFileCheckPointObject){
            currentFileCheckPointObject = {} as CheckPointObject;
        }
        this.treeDataProvider = new CheckPointProvider(this.checkPointExplorerContext, currentFileCheckPointObject as CheckPointObject);
        this.checkPointTreeView = vscode.window.createTreeView('checkPointExplorer', { treeDataProvider:this.treeDataProvider });
    }
}   