// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {CheckPointExplorer, initLogger} from './CheckPointExplorer';
import {createLogger, transports, Logger, format} from 'winston'; 
import { LEVEL, MESSAGE } from 'triple-beam';
import {join} from 'path';

export function activate(context: vscode.ExtensionContext) {
	let logger: Logger = initLogger(context.logPath);
	new CheckPointExplorer(context, logger);
}



// this method is called when your extension is deactivated
export function deactivate() {}
