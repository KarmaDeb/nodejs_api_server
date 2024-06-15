import * as fs from 'fs';
import * as path from 'path';

import Command from "./Command";
import type { Logger } from 'winston';

export default class CommandProcessor {
    
    private static instance: CommandProcessor;

    private readonly logger: Logger;
    private readonly commands: Array<Command> = Array();

    public constructor(logger: Logger) {
        this.logger = logger;
        CommandProcessor.instance = this;
    }

    public getCommands(page: number = 0): { currentPage: number, maxPages: number, elements: Array<Command> }|null {
        const elements: Array<Command> = Array.from(this.commands);
        const maxPages: number = Math.ceil(elements.length / 10);

        if ((page - 1) >= maxPages)
            return null;

        page = Math.max(0, page - 1);
        const startIndex: number = page * 10;
        const endIndex: number = startIndex + 10;
        const pagedElements: Array<Command> = elements.slice(startIndex, endIndex);

        return {
            currentPage: page + 1,
            maxPages: maxPages,
            elements: pagedElements
        };
    }

    /**
     * Register a new command
     * @param command the command to register
     */
    public registerCommand(command: Command): void {
        if (this.commands.some((cmd) => this.equalsIgnoreCase(command.getName(), cmd.getName())))
            return;

        this.logger.info(`Registered command: ${command.getName()}`);
        this.commands.push(command);
    }

    /**
     * Removes a command
     * @param command the command to remove
     */
    public removeCommand(command: Command): void {
        const index: number = this.commands.indexOf(command);
        if (index == -1)
            return;

        this.commands.splice(index, 1);
    }

    /**
     * Get a command
     * @param cmd the command name
     */
    public getCommand(cmd: string): Command|null {
        return this.commands.find((command) => this.equalsIgnoreCase(command.getName(), cmd)) || null;
    }

    /**
     * Process the executor directory
     * in search of valid commands
     */
    public async process(): Promise<void> {
        const executorDir: string = path.resolve(__dirname, 'executor');
        const fileNames: Array<string> = fs.readdirSync(executorDir);
        
        for (const fileName of fileNames) {
            if (!fileName.endsWith('.ts')) 
                continue;

            const filePath: string = path.join(executorDir, fileName);
            try {
                const module: object = await import(filePath);
                for (const exported of Object.values(module)) {
                    if (typeof exported === 'function' && this.isCommand(exported)) {
                        const instance: Command = new exported(this.logger);
                        this.registerCommand(instance);
                    }
                }
            } catch (error) {

            }
        }
    }
    
    private isCommand(clazz: any): boolean {
        if (!clazz)
            return false;

        return clazz.prototype instanceof Command;
    }

    private equalsIgnoreCase(string1: string, string2: string): boolean {
        return string1.toLowerCase() === string2.toLowerCase();
    }

    public static getInstance(): CommandProcessor {
        return CommandProcessor.instance;
    }
}