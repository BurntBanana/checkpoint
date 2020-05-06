import * as vscode from 'vscode';
import { CheckPointObject, CheckPointTreeItem } from './Interfaces/checkPointInterfaces';
import { logger, initLogger } from './logger';
import { CheckPointProvider, CheckPointObjectImpl } from './checkPointProvider';
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

    private currentFileCheckPointObject: CheckPointObject = {} as CheckPointObject;

    /**
     * Constructor method to initialize class members and register commands.
     *
     * @param context - The `ExtensionContext` object that is to be used to store globalState.
     *
     */
    constructor(context: vscode.ExtensionContext) {
        this.checkPointExplorerContext = context;

        if (!logger) {
            initLogger(context.logPath);
        }

        this.createDataProvider();

        logger.info("Registering commands");
        context.subscriptions.push(vscode.commands.registerCommand('checkPointExplorer.commenceTracking', () => this.commenceTracking()));
        context.subscriptions.push(vscode.commands.registerCommand('checkPointExplorer.openCheckPoint',
            index => this.treeDataProvider?.openCheckPoint(index).catch(
                error => logger.warn("Open checkpoint failed for index: " + index)
            )));
        context.subscriptions.push(vscode.commands.registerCommand('checkPointExplorer.deleteAllCheckPoints', () => this.deleteCheckPoints()));
        context.subscriptions.push(vscode.commands.registerCommand('checkPointExplorer.deleteCheckPoint',
            element => this.treeDataProvider?.deleteSingleCheckPoint(element.index).catch(
                error => logger.warn("Delete checkpoint failed for index: " + element.index)
            )));
        context.subscriptions.push(vscode.commands.registerCommand('checkPointExplorer.setActiveCheckPoint',
            element => this.treeDataProvider?.setActiveCheckPoint(element.index).catch(
                error => logger.warn("Set active checkpoint failed for index: " + element.index)
            )));

        //Handle file save events.
        vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
            if (this.treeDataProvider && Object.keys(this.currentFileCheckPointObject).length) {
                this.treeDataProvider.saveCheckPoint(document);
            } else {
                logger.warn("Commence tracking not initialised");
            }

        });

        //Handle active editor switch events.
        vscode.window.onDidChangeActiveTextEditor((documentEditor: vscode.TextEditor | undefined) => {
            logger.info("Active editor switched to: " + documentEditor?.document.fileName);
            if (documentEditor) {
                this.currentFileCheckPointObject = this.checkPointExplorerContext.globalState.get(documentEditor.document.fileName || "") || {} as CheckPointObject;
                this.treeDataProvider?.updateLastSavedFile(documentEditor.document.getText());
                this.treeDataProvider?.updateCheckPointObject(this.currentFileCheckPointObject);
            }
            else {
                logger.warn("Active editor is undefined");
                this.treeDataProvider?.updateCheckPointObject({} as CheckPointObject);
            }
        });

    }

    /**
     * Method to delete all CheckPoints from the `TreeView`.
     * Initiated by the `deleteAllCheckPoints` command.
     * 
     * @returns void.
     *
     */
    private deleteCheckPoints(): void {
        logger.info("Deleting all checkpoints");
        this.treeDataProvider?.updateCheckPointObject({} as CheckPointObject);
        this.currentFileCheckPointObject = {} as CheckPointObject;
    }

    /**
     * Method to initiate CheckPoint tracking for a file which is currently untracked.
     * Initiated by the `commenceTracking` command.
     * 
     * @returns void.
     *
     */
    private commenceTracking(): void {
        const currentDocument: vscode.TextDocument | undefined = vscode.window.activeTextEditor?.document;
        if (currentDocument) {
            logger.info("Starting file tracking for: " + currentDocument.fileName);
            const currentDocumentText = currentDocument.getText();            
            this.currentFileCheckPointObject = new CheckPointObjectImpl([currentDocumentText as string], [new Date(Date.now())], currentDocumentText as string, 0);
            this.treeDataProvider?.updateCheckPointObject(this.currentFileCheckPointObject as CheckPointObject);
        }
        else {
            logger.warn("Document is undefined");
        }
    }

    /**
     * Method to intialize the `treeDataProvider` and `checkPointTreeView` objects.
     * 
     * @returns void.
     *
     */
    private createDataProvider(): void {
        logger.info("Creating tree data provider");
        let current_document: vscode.TextDocument | undefined = vscode.window.activeTextEditor?.document;
        this.currentFileCheckPointObject = this.checkPointExplorerContext.globalState.get(current_document?.fileName || "") || {} as CheckPointObject;
        this.treeDataProvider = new CheckPointProvider(this.checkPointExplorerContext, this.currentFileCheckPointObject as CheckPointObject);
        this.checkPointTreeView = vscode.window.createTreeView('checkPointExplorer', { treeDataProvider: this.treeDataProvider });
    }
}  