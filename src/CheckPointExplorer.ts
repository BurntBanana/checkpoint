import * as vscode from 'vscode';
import {CheckPointObject, CheckPointTreeItem} from './Interfaces/CheckPointInterfaces';
import * as path from 'path';
import {diff_match_patch, patch_obj} from 'diff-match-patch';
import * as dateFormat from 'dateformat';

/**
 * Concrete class to initialise CheckPointTreeItem objects
 * @param timestamp Date of checkpoint creation
 * @param index Index of Tree item
 * */
class CheckPointTreeItemImpl implements CheckPointTreeItem {
    constructor (public timestamp: Date, public index: number) {}
}
/**
 * Concrete class to initialise CheckPointObject objects
 * @param patches Array of patch or file
 * @param timestamps Array of date objects
 * @param current Current text content of file
 * */
class CheckPointObjectImpl implements CheckPointObject {
    constructor (public patches: Array<patch_obj[]|string>, public timestamps: Array<Date>, public current: string) {}
}

/**
	 * Represents TreeDataProvider implementation
*/
export class CheckPointProvider implements vscode.TreeDataProvider<CheckPointTreeItem> {
    /**diff-patch-match object */
    private dmp: diff_match_patch; 

    /*** Event to signal that an element or root has changed.*/
    private _onDidChangeTreeData: vscode.EventEmitter<CheckPointTreeItem>;

    onDidChangeTreeData: vscode.Event<CheckPointTreeItem>;

    /** Global context object */
    private checkPointContext: vscode.ExtensionContext;

    /** Current active CheckPoint object */
    private checkPointObject: CheckPointObject; 

    /** Interval to store file in patches array */
    private interval: number;   

    /** Set if checkpoint is currently in selection */
    private checkPointSelected : boolean;

    /**
     * Returns the closest file checkpoint
     * @param index Index whose closest checkpoint is to be computed
     * @returns [number](#number) Closest checkpoint 
     */
    private closestCheckPoint = (index : number) => {
        return (Math.floor(index/this.interval) * this.interval);
    };

    /**
     * @param context Application context
     * @param currentFileCheckPointObject CheckPointObject for the current active file
     * */
    constructor(context: vscode.ExtensionContext, currentFileCheckPointObject: CheckPointObject) {
        //update TreeView event
        this._onDidChangeTreeData = new vscode.EventEmitter<CheckPointTreeItem>();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.checkPointContext = context;
        this.checkPointObject = currentFileCheckPointObject;
        this.interval = vscode.workspace.getConfiguration("checkpoint").get("interval") || 4;
        this.checkPointSelected = false;
        this.dmp = new diff_match_patch();
    }

    /**
     * Update the current text editor to show file at selected checkpoints
     * @param checkPointData [string](#string) File content at checkpoint
     */
    private editorUpdate(checkPointData : string) {
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
    
            this.checkPointSelected = true; //set checkpoint as selected
        }
    }

    /**
     * Triggered when checkpoint is clicked on UI
     * @param index [number](#number) Index of selected checkpoint
     */
    public openCheckPoint(index: number) {
        const document = vscode.window.activeTextEditor?.document;
        //if file is unsaved, make checkpoint and proceeed
        if (document) {
            this.saveCheckPoint(vscode.window.activeTextEditor?.document as vscode.TextDocument, this.checkPointSelected); 
            this.editorUpdate(this.generateFileByPatch(index));
        }
    }

    /**
     * Triggered when file is saved
     * @param document [vscode.TextDocument](#vscode.TextDocument) document which is saved
     * @param check [boolean](#boolean) Set to true if checkpoint is opened
     */
    public saveCheckPoint(document: vscode.TextDocument, check: boolean = false) {

        //check for save as
        if (vscode.window.activeTextEditor?.document.fileName !== document.fileName) {
            return;
        }

        const currentFile : string = document.getText();
        let previousFile = this.checkPointObject.current;

        //if both files are same or checkpoint is opened
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
            let previousFile = this.checkPointObject.current;
            let patch:patch_obj[] = this.dmp.patch_make(previousFile, currentFile);
            this.checkPointObject.patches.push(patch);
        }

        this.checkPointObject.current = currentFile;
        this.checkPointObject.timestamps.push(new Date(Date.now()));
        
        this.updateCheckPointObject(this.checkPointObject);
    }
    /**
     * Get the children of CheckPointObject
     *
     * @param element The element from which the provider gets children. Can be `undefined`.
     * @return TreeItems generated from CheckPointObject
     */
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
        treeItem.command = { command: 'checkPointExplorer.openFile', title: "Open File", arguments: [element.index], };
		return treeItem;

    }

    /**
     * Method to update the current CheckPointObject in the globalState and fire an event to update the TreeView.
     *
     * @param checkPointObject - The CheckPointObject to be updated.
     * @returns void
     *
     */
    updateCheckPointObject(checkPointObject: CheckPointObject) : void{
        //If passed object is empty, update null value in globalState.
        if (Object.keys(checkPointObject).length === 0) {
            this.checkPointContext.globalState.update(vscode.window.activeTextEditor?.document.fileName || "", null);
        }
        else {
            this.checkPointContext.globalState.update(vscode.window.activeTextEditor?.document.fileName || "", checkPointObject);
        }
        this.checkPointObject = checkPointObject;
        this._onDidChangeTreeData.fire();
    }

    /**
     * Method to delete the selected CheckPoint.
     *
     * @param index - The index of the CheckPoint to be deleted.
     * @returns void
     *
     */
    deleteSingleCheckPoint(index : number) : void{
        let generatedFile : string = "";

        //If there is only a single CheckPoint in the view.
        if (this.checkPointObject.patches.length === 1 && index === 0) {
            this.updateCheckPointObject({} as CheckPointObject);
            return;
        }
        //If the last element is being deleted.
        if(index === this.checkPointObject.patches.length - 1){
            this.checkPointObject.current = this.generateFileByPatch(index -1);
        }
        else if(index === this.closestCheckPoint(index)){
            generatedFile = this.checkPointObject.patches[index] as string;
        }
        else {
            generatedFile = this.generateFileByPatch(index - 1);
            //Bridge previous and next files by generating a patch.
            this.checkPointObject.patches[index + 1] = this.dmp.patch_make(generatedFile, this.generateFileByPatch(index + 1));
        }
        this.checkPointObject.patches.splice(index, 1);
        this.checkPointObject.timestamps.splice(index, 1);

        for(let k = index; k < this.checkPointObject.patches.length; k++){
            if(k === this.closestCheckPoint(k)){
                //Generate a file by applying patches as current index is now an interval CheckPoint file.
                this.checkPointObject.patches[k] = this.dmp.patch_apply(this.checkPointObject.patches[k] as patch_obj[], generatedFile)[0];
            }
            else if(k === this.closestCheckPoint(k+1) -1){
                //Generate a patch as current index is now no longer an interval CheckPoint file.
                this.checkPointObject.patches[k] = this.dmp.patch_make(generatedFile, this.checkPointObject.patches[k] as string);
            }
            generatedFile = this.generateFileByPatch(k);
        }
        this.updateCheckPointObject(this.checkPointObject);
    }

    /**
     * Method to generate a file at a given index.
     *
     * @param index - The index of the CheckPoint to be generated.
     * @returns generatedFile - string object that contains the actual file state at given index.
     *
     */
    private generateFileByPatch(index : number) : string {
        let generatedFile : string = this.checkPointObject.patches[this.closestCheckPoint(index)] as string;
        for(let i = this.closestCheckPoint(index) + 1; i<= index; i++){
            generatedFile = this.dmp.patch_apply(this.checkPointObject.patches[i] as patch_obj[], generatedFile)[0];
        }
        return generatedFile;
    }
}

/**
 * Class to generate and set the `TreeDataProvider` & `TreeView` for displaying CheckPoints.
 */
export class CheckPointExplorer {
    /**
     *`TreeView` object to utlize the Tree's data.
     */
    private checkPointTreeView: vscode.TreeView<CheckPointTreeItem> | undefined = undefined;
    /**
     *`ExtensionContext` object to store globalState.
     */
    private checkPointExplorerContext: vscode.ExtensionContext;
    /**
     *`CheckPointProvider` object to store the Tree's data in order to set the `checkPointTreeView` object.
     */
    private treeDataProvider: CheckPointProvider | undefined = undefined;

    /**
     * Constructor method to initialize class members and register commands.
     *
     * @param context - The `ExtensionContext` object that is to be used to store globalState.
     *
     */
    constructor(context: vscode.ExtensionContext){
        this.checkPointExplorerContext = context;
        this.createDataProvider();
        vscode.commands.registerCommand('checkPointExplorer.commenceTracking', () => this.commenceTracking());
        vscode.commands.registerCommand('checkPointExplorer.openFile', (index) => this.openProviderCheckPoint(index));
        vscode.commands.registerCommand('checkPointExplorer.deleteAllCheckPoints', () => this.deleteCheckPoints());
        vscode.commands.registerCommand('checkPointExplorer.deleteCheckPoint', (element) => this.deleteSingleCheckPoint(element));
        
        //Handle file save events.
        vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {	
            if(this.treeDataProvider) {
                this.treeDataProvider.saveCheckPoint(document);
            }
            
        });
        
        //Handle active editor switch events.
        vscode.window.onDidChangeActiveTextEditor((documentEditor : vscode.TextEditor | undefined) => {
            this.activeEditorChange(documentEditor);
        });
        
    }

    /**
     * Method to delete a CheckPoint from the `TreeView`.
     * Initiated by the `deleteCheckPoint` command.
     * 
     * @param element - The `CheckPointTreeItem` object that is provided by the `deleteCheckPoint` command.
     * @returns void.
     *
     */
    private deleteSingleCheckPoint(element : CheckPointTreeItem) : void{
       if(this.treeDataProvider){
           this.treeDataProvider?.deleteSingleCheckPoint(element.index);
       }
    }

    /**
     * Method to delete all CheckPoints from the `TreeView`.
     * Initiated by the `deleteAllCheckPoints` command.
     * 
     * @returns void.
     *
     */
    private deleteCheckPoints() : void {
        this.treeDataProvider?.updateCheckPointObject({} as CheckPointObject);
    }

    /**
     * Method to open a CheckPoint in the `ActiveTextEditor`.
     * Initiated by the `openFile` command.
     * 
     * @param index - The index of the CheckPoint to be generated.
     * @returns void.
     *
     */
    private openProviderCheckPoint(index: number) : void {
        this.treeDataProvider?.openCheckPoint(index);
    }

    /**
     * Method to handle `ActiveTextEditor` changes by user.
     * Initiated by the `onDidChangeActiveTextEditor` event trigger.
     * 
     * @param textEditor - The current `TextEditor` object to which the view was changed to.
     * @returns void.
     *
     */
    private activeEditorChange(textEditor : vscode.TextEditor | undefined) : void {
        if (textEditor) {
            let currentFileCheckPointObject = this.checkPointExplorerContext.globalState.get(textEditor.document.fileName || "") || {} as CheckPointObject;
            this.treeDataProvider?.updateCheckPointObject(currentFileCheckPointObject as CheckPointObject);
        }
        
    }

    /**
     * Method to initiate CheckPoint tracking for a file which is currently untracked.
     * Initiated by the `commenceTracking` command.
     * 
     * @returns void.
     *
     */
    private commenceTracking() : void {
        const currentDocumentText : string | undefined = vscode.window.activeTextEditor?.document.getText();
        if (currentDocumentText) {
            let currentFileCheckPointObject = new CheckPointObjectImpl([currentDocumentText as string], [new Date(Date.now())], currentDocumentText as string);
            this.treeDataProvider?.updateCheckPointObject(currentFileCheckPointObject as CheckPointObject);
        }
    }

    /**
     * Method to intialize the `treeDataProvider` and `checkPointTreeView` objects.
     * 
     * @returns void.
     *
     */
    private createDataProvider() : void{
        let current_document : vscode.TextDocument | undefined = vscode.window.activeTextEditor?.document;
        let currentFileCheckPointObject = this.checkPointExplorerContext.globalState.get(current_document?.fileName || "") || undefined;
        
        if(!currentFileCheckPointObject){
            currentFileCheckPointObject = {} as CheckPointObject;
        }
        this.treeDataProvider = new CheckPointProvider(this.checkPointExplorerContext, currentFileCheckPointObject as CheckPointObject);
        this.checkPointTreeView = vscode.window.createTreeView('checkPointExplorer', { treeDataProvider:this.treeDataProvider });
    }
}   