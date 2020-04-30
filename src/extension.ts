// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {CheckPointExplorer} from './checkPointExplorer';
import {logger, initLogger} from './logger';

export function activate(context: vscode.ExtensionContext) {
	if (context) {
		initLogger(context.logPath);
		new CheckPointExplorer(context);

	}
	else {
		logger.error("Context is undefined.");
	}
}

// this method is called when your extension is deactivated
export function deactivate(context: vscode.ExtensionContext) {
	context.subscriptions.forEach(element => {
		element.dispose();
	});
}
export {logger};
