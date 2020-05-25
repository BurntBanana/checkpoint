import { createLogger, transports, Logger, format, info } from 'winston';
import { LEVEL, MESSAGE } from 'triple-beam';
import { existsSync, lstatSync } from 'fs';
import * as vscode from 'vscode';
import { join, resolve } from 'path';

let logger: Logger;
let makeSilent: boolean = false;


/**
 * Creates a `winston.Logger` with custom transports.
 *
 * @param logPath The path where the logs are to be stored.
 * @return logger The newly created `winston.Logger` object.
*/
export function initLogger(logPath: string): void {
    const isDirExists = existsSync(resolve(logPath, '..'));
    const config = vscode.workspace.getConfiguration('checkpoint');
     /* istanbul ignore next */ 
    if (process.env.NODE_ENV === 'development') {
        let consoleTransport = new transports.Console({
            log(info, callback) {
                if (this.stderrLevels ? [info[LEVEL]] : "") {
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
        consoleTransport.name = "console";
        const dateColorizer = format.colorize({ colors: { info: 'green' } });
        const options = {
            transports: [
                consoleTransport
            ],
            format: format.combine(
                format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss'
                }),
                format.printf(info => `${dateColorizer.colorize(info.level, info.timestamp)} [${info.level}] ${info.message}`)
            ),
            exceptionHandlers: [
                consoleTransport
            ]
        };
        logger = createLogger(options);
        logger.transports[0].silent = makeSilent;
    }
    else {
        logger = createLogger();

    }


    if (isDirExists) {
        logger.add(new transports.File({ filename: join(logPath, config.get('logFile') as string) }));
        logger.exceptions.handle(
            new transports.File({ filename: join(logPath, config.get('errorLogFile') as string) })
        );
        logger.info('Initialized logging for Console & File mode successfully.');
    }
}
export function silenceLogs(value: boolean) {
    makeSilent = value;
}

export { logger };

