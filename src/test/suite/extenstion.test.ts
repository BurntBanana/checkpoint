import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as extension from '../../extension';
import {ExtensionContext, ExtImpl, Memento, MemImpl} from './createContext';
import { readFileSync, rmdirSync, existsSync, readdirSync, lstatSync, unlinkSync } from 'fs';
import {join} from 'path';
var deleteFolderRecursive = function(path:string) {
    if( existsSync(path) ) {
      readdirSync(path).forEach(function(file,index){
        var curPath = path + "/" + file;
        if(lstatSync(curPath).isDirectory()) { // recurse
          deleteFolderRecursive(curPath);
        } else { // delete file
          unlinkSync(curPath);
        }
      });
      rmdirSync(path);
    }
  };

describe('Extension', () => {
  it('should initialise logger', () => {
    const logPath = join(__dirname, 'logs');
    let context : ExtensionContext = new ExtImpl([],new MemImpl(),new MemImpl(),"test","test","test", logPath);
    extension.activate(context).then((val) =>{
      const logFile = readFileSync(join(logPath, vscode.workspace.getConfiguration('checkpoint').get('logFile') as string));
      assert.notEqual(logFile.length, 0);
      deleteFolderRecursive(logPath);
    }); 
  });
});
