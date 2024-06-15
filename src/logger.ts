import { createLogger, format, transports } from "winston";
import * as fs from 'fs';
import * as path from 'path';

const logsDir = 'logs';

if (!fs.existsSync(logsDir))
    fs.mkdirSync(logsDir);

let rotated = false;
export function rotateLogs() {
    const logFile: string = path.join(logsDir, 'latest.log');
    const errorsFile: string = path.join(logsDir, 'errors.log');

    if (!fs.existsSync(logFile) || !fs.existsSync(errorsFile))
        return;

    const date = new Date();

    const year: string = date.getFullYear().toString();
    const month: string = date.getMonth().toString().padStart(2, '0');
    const day: string = date.getDay().toString().padStart(2, '0');

    const dayDirectory: string = path.join(logsDir, year, month, day);
    if (!fs.existsSync(dayDirectory))
        fs.mkdirSync(dayDirectory, {recursive: true});

    let logsCount: number = 1;
    let errorsCount: number = 1;

    for (const fileName of fs.readdirSync(dayDirectory)) {
        if (fileName.startsWith('logfile_')) {
            logsCount += 1;
        } else {
            errorsCount += 1;
        }
    }

    const newLogFile: string = path.join(dayDirectory, `log_${logsCount}.log`);
    const newErrFile: string = path.join(dayDirectory, `errors_${errorsCount}.log`);

    fs.renameSync(logFile, newLogFile);
    fs.renameSync(errorsFile, newErrFile);
};
if (!rotated) {
    rotateLogs();
    rotated = true;
}

export default createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'DD/MM/YYYY HH:mm:SS' }),
        format.printf(({timestamp, level, message}) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: path.join(logsDir, 'latest.log'), level: 'debug' })
    ],
    exceptionHandlers: [
        new transports.File({ filename: path.join(logsDir, 'errors.log') })
    ]
});