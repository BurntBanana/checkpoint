import * as vscode from 'vscode';
import { CheckPointObject, CheckPointTreeItem } from './Interfaces/checkPointInterfaces';
import { join,} from 'path';
import { diff_match_patch, patch_obj } from 'diff-match-patch';
import * as dateFormat from 'dateformat';
import { logger, initLogger } from './logger';

/**
 * Concrete class to initialise CheckPointTreeItem objects
 * @param timestamp Date of checkpoint creation
 * @param index Index of Tree item
 * */
export class CheckPointTreeItemImpl implements CheckPointTreeItem {
    constructor(public timestamp: Date, public index: number) { }
}
/**
 * Concrete class to initialise CheckPointObject objects
 * @param patches Array of patch or file
 * @param timestamps Array of date objects
 * @param current Current text content of file
 * */
export class CheckPointObjectImpl implements CheckPointObject {
    constructor(public patches: Array<patch_obj[] | string>, public timestamps: Array<Date>, public current: string, public active: number) { }
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

    /** Last saved value of the current file */
    private lastSavedFile: string;

    /** Set if save chekpoint has to be skipped */
    private skipSave: boolean;

    /**
     * Returns the closest file checkpoint
     * @param index Index whose closest checkpoint is to be computed
     * @returns [number](#number) Closest checkpoint 
     */
    private closestCheckPoint = (index: number) => {
        return (Math.floor(index / this.interval) * this.interval);
    };

    /**
     * @param context Application context
     * @param currentFileCheckPointObject CheckPointObject for the current active file
     * */
    constructor(context: vscode.ExtensionContext, currentFileCheckPointObject: CheckPointObject) {

        if (!logger) {
            initLogger(context.logPath);
        }

        //update TreeView event
        this._onDidChangeTreeData = new vscode.EventEmitter<CheckPointTreeItem>();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.checkPointContext = context;
        this.checkPointObject = currentFileCheckPointObject;
        this.interval = vscode.workspace.getConfiguration("checkpoint").get("interval") || 4;
        logger.info("Checkpoint interval has been set to: " + this.interval);
        logger.info("Initialising diff patch match object");
        this.lastSavedFile = currentFileCheckPointObject?.current || "";
        this.dmp = new diff_match_patch();
        this.skipSave = false;
    }

    /**
     * Update the current text editor to show file at selected checkpoints
     * @param checkPointData [string](#string) File content at checkpoint
     */
    private editorUpdate(checkPointData: string) {
        return new Promise((resolve, reject) => {
            const { activeTextEditor } = vscode.window;
            if (activeTextEditor) {
                const { document } = activeTextEditor;
                if (document) {
                    let dataRange: vscode.Range = document.validateRange(new vscode.Range(0, 0, document.lineCount as number, 0));
                    activeTextEditor.edit(editBuilder => {
                        editBuilder.replace(dataRange, checkPointData);
                    })
                        .then(() => {
                            this.lastSavedFile = document.getText();
                            logger.info("Active document text changed");
                            resolve(true);
                        }, () => {
                            logger.warn("Text editor update failed for: " + document.fileName);
                            reject(false);
                        });
                }
                else {
                    logger.warn("Document is undefined");
                    reject(false);
                }
            }
            else {
                logger.warn("Active editor is undefined");
                reject(false);
            }
        });
    }

    /**
     * Triggered when checkpoint is clicked on UI
     * @param index [number](#number) Index of selected checkpoint
     */
    public openCheckPoint(index: number) {
        logger.info("Checkpoint " + index + " selected");
        const document = vscode.window.activeTextEditor?.document;
        if (document) {
            if (this.lastSavedFile !== document?.getText()) {
                this.saveCheckPoint(document as vscode.TextDocument);
            }
        }
        else {
            logger.warn("Document is undefined");
        }

        return new Promise(async (resolve, reject) => {
            const file = await this.generateFileByPatch(index).catch(error => reject(error));
            if (file) {
                this.editorUpdate(file).then(() => {
                    resolve(true);
                }, () => {
                    logger.warn("Editor update failed for index: " + index);
                    reject(false);
                });
            }
        });
    }

    /**
     * Triggered when file is saved
     * @param document [vscode.TextDocument](#vscode.TextDocument) document which is saved
     * @param calledByOpen [boolean](#boolean) Set to true if checkpoint is opened
     */
    public saveCheckPoint(document: vscode.TextDocument) {

        const currentFile: string = document.getText();
        let previousFile = this.checkPointObject.current;

        if (!document) {
            logger.warn("Document is undefined");
            return;
        }
        //check for save as or active file or if both files are same or checkpoint is opened
        else if (this.skipSave || (vscode.window.activeTextEditor?.document.fileName !== document.fileName) || (currentFile === previousFile)) {
            logger.info(document.fileName + " not saved because it is either:\n 1.Active,\t2.Saved As,\t3.Called by open\t4.Same file");
            return;
        }

        logger.info("Saving new checkpoint for: " + document.fileName);

        this.lastSavedFile = currentFile;


        //check whether to store patch or file
        if (this.checkPointObject.patches.length % this.interval === 0) {
            logger.info("Saving file");
            this.checkPointObject.patches.push(currentFile);
        }
        else {
            logger.info("Saving patch");
            let previousFile = this.checkPointObject.current;
            let patch: patch_obj[] = this.dmp.patch_make(previousFile, currentFile);
            this.checkPointObject.patches.push(patch);
        }

        this.checkPointObject.current = currentFile;
        this.checkPointObject.timestamps.push(new Date(Date.now()));

        //set new checkpoint as active
        this.checkPointObject.active = this.checkPointObject.patches.length - 1;
        logger.info("Checkpoint " + this.checkPointObject.active + " created for: " + document.fileName);
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
            logger.info("No tree data");
            return result;
        }
        else {
            logger.info("Creating tree items");
            for (let i = 0; i < this.checkPointObject.patches.length; i++) {
                const treeItem: CheckPointTreeItem = new CheckPointTreeItemImpl(this.checkPointObject.timestamps[i], i);
                result.push(treeItem);
            }
        }
        return result;
    }
    /**
    *Method to display tree element from `CheckPointTreeItem` object.
    * @param element CheckPointTreeItem object.
    * @return TreeItem generated from CheckPointTreeItem
    */
    getTreeItem(element: CheckPointTreeItem): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(dateFormat(element.timestamp));
        // let resourcePath: string = join(__dirname, element.index === this.checkPointObject.active ? garbage : normalLogo);
        let resourcePath: string = join(__filename, '..', '..', 'resources', element.index === this.checkPointObject.active ? '/garbage.svg' : '/checkPointIcon.svg');
        treeItem.contextValue = "checkPointItem";
        treeItem.iconPath = { light: resourcePath, dark: resourcePath };
        treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
        treeItem.command = { command: 'checkPointExplorer.openCheckPoint', title: "Open CheckPoint", arguments: [element.index], };
        return treeItem;
    }

    /**
     * Method to update the current CheckPointObject in the globalState and fire an event to update the TreeView.
     *
     * @param checkPointObject - The CheckPointObject to be updated.
     * @returns Promise<boolean>
     *
     */
    updateCheckPointObject(checkPointObject: CheckPointObject): Promise<boolean> {

        return new Promise((resolve, reject) => {

            //If passed object is empty, update null value in globalState.
            const fileName = vscode.window.activeTextEditor?.document.fileName;

            if (fileName) {

                if (Object.keys(checkPointObject).length === 0) {
                    logger.info("Clearing all checkpoint data for: " + fileName);
                    this.checkPointContext.globalState.update(fileName, null);
                }
                else {
                    logger.info("Updated checkpoint data for: " + fileName);
                    this.checkPointContext.globalState.update(fileName, checkPointObject);
                }

                this.checkPointObject = checkPointObject;

                logger.info("Refreshing tree");
                this._onDidChangeTreeData.fire();
                resolve(true);
            }
            else {
                logger.warn("Active editor is undefined");
                this.checkPointObject = checkPointObject;
                this._onDidChangeTreeData.fire();
                reject(false);
            }
        });

    }
    /**
     * Method to update the last saved file.
     *
     * @param string - New value for current document text.
     * @returns void
     *
     */
    updateLastSavedFile(documentText: string) {
        this.lastSavedFile = documentText;
    }

    /**
     * Method to delete the selected CheckPoint.
     *
     * @param index - The index of the CheckPoint to be deleted.
     * @returns void
     *
     */
    async deleteSingleCheckPoint(index: number): Promise<void> {
        let generatedFile: string = "";
        logger.info("Deleing checkpoint: " + index);
        //If there is only a single CheckPoint in the view.
        if (this.checkPointObject.patches.length === 1 && index === 0) {
            this.updateCheckPointObject({} as CheckPointObject);
            return;
        }
        //If the last element is being deleted.
        if (index === this.checkPointObject.patches.length - 1) {
            this.checkPointObject.current = await this.generateFileByPatch(index - 1);
        }
        else if (index === this.closestCheckPoint(index)) {
            generatedFile = this.checkPointObject.patches[index] as string;
        }
        else {
            generatedFile = await this.generateFileByPatch(index - 1);
            //Bridge previous and next files by generating a patch.
            this.checkPointObject.patches[index + 1] = this.dmp.patch_make(generatedFile, await this.generateFileByPatch(index + 1));
        }
        this.checkPointObject.patches.splice(index, 1);
        this.checkPointObject.timestamps.splice(index, 1);

        for (let k = index; k < this.checkPointObject.patches.length; k++) {
            if (k === this.closestCheckPoint(k)) {
                //Generate a file by applying patches as current index is now an interval CheckPoint file.
                this.checkPointObject.patches[k] = this.dmp.patch_apply(this.checkPointObject.patches[k] as patch_obj[], generatedFile)[0];
            }
            else if (k === this.closestCheckPoint(k + 1) - 1) {
                //Generate a patch as current index is now no longer an interval CheckPoint file.
                this.checkPointObject.patches[k] = this.dmp.patch_make(generatedFile, this.checkPointObject.patches[k] as string);
            }
            generatedFile = await this.generateFileByPatch(k);
        }

        this.updateCheckPointObject(this.checkPointObject);

        //Active node is deleted
        if (index === this.checkPointObject.active) {
            this.setActiveCheckPoint(this.checkPointObject.active - 1);

        }
        else if (index < this.checkPointObject.active) {
            this.checkPointObject.active -= 1;
        }
    }

    /**
     * Method to generate a file at a given index.
     *
     * @param index - The index of the CheckPoint to be generated.
     * @returns Promise<string | false> - Returns the generated file at index. 
     *
     */
    private generateFileByPatch(index: number): Promise<string> {
        return new Promise((resolve, reject) => {

            if (this.checkPointObject.patches.length >= index) {
                logger.info("Generating file for checkpoint: " + index);

                let generatedFile: string = this.checkPointObject.patches[this.closestCheckPoint(index)] as string;

                for (let i = this.closestCheckPoint(index) + 1; i <= index; i++) {
                    generatedFile = this.dmp.patch_apply(this.checkPointObject.patches[i] as patch_obj[], generatedFile)[0];
                }
                resolve(generatedFile);
            }
            else {
                logger.warn("File generation failed at index: " + index);
                reject(false);
            }
        });

    }
    /**
     * Method to set file at selected index as active.
     *
     * @param index - The index of the CheckPoint to be set active.
     */
    setActiveCheckPoint(index: number) {

        return new Promise(async (resolve, reject) => {
            this.checkPointObject.active = index;
            await this.openCheckPoint(index);
            this.skipSave = true;
            const document = vscode.window.activeTextEditor?.document;
            if (document) {
                logger.info("Active checkpoint set to: " + index);
                await vscode.window.activeTextEditor?.document.save();
                this._onDidChangeTreeData.fire();
                this.skipSave = false;
                resolve(true);
            }
            else {
                logger.warn("Document is undefined");
                reject(false);
            }
        });


    }
}