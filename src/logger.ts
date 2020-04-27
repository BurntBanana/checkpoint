import {createLogger, transports, Logger, format, info} from 'winston'; 
import { LEVEL, MESSAGE } from 'triple-beam';
import { existsSync, lstatSync } from 'fs';
import * as vscode from 'vscode';
import {join, resolve} from 'path';
export {Logger} from 'winston';

/**
 * Creates a `winston.Logger` with custom transports.
 *
 * @param logPath The path where the logs are to be stored.
 * @return logger The newly created `winston.Logger` object.
 */
export function initLogger(logPath:string):Logger {
    const config = vscode.workspace.getConfiguration('checkpoint');
    const isDirExists = existsSync(resolve(logPath, '..'));
    const consoleTransport = new transports.Console({
        log(info, callback) {
            if (this.stderrLevels?[info[LEVEL]]:"") {
                console.error(info[MESSAGE]);
                if (callback) {
                    callback();
                }
                return;
            }
            console.log(info[MESSAGE]);
            if (callback) {
                callback();
            }
        }
    });

    const options =  {
        transports: [   
            consoleTransport
        ],
        format: format.combine(
            format.colorize(),
            format.timestamp({
              format: 'YYYY-MM-DD HH:mm:ss'
            }),
            format.printf(info => `[${info.timestamp}] [${info.level}] ${info.message}`)
        ),
        exceptionHandlers: [
            consoleTransport
        ]
    };
    let logger : Logger = createLogger(options);
    if (isDirExists) {
        logger.add(new transports.File({ filename: join(logPath, config.get('logFile') as string)}));
        logger.exceptions.handle(
            new transports.File({ filename: join(logPath, config.get('errorLogFile') as string) })
        );
        logger.info('Initialized logging for Console & File mode successfully.');
    }
    else{
        logger.warn("Log file path does not exist. Logging only in console");
    }
    return createLogger(options);
}