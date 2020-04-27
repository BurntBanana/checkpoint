// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {CheckPointExplorer} from './checkPointExplorer';
import {initLogger, Logger} from './logger';
let logger: Logger;

export function activate(context: vscode.ExtensionContext) {
	if (context) {
		logger = initLogger(context.logPath);
		new CheckPointExplorer(context);
	}
	else {
		console.error("Context is undefined.");
	}
}

// this method is called when your extension is deactivated
export function deactivate() {}
export {logger};
