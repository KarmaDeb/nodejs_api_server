import Command from "../Command";
import CommandProcessor from "../CommandProcessor";

export default class HelpCommand extends Command {

    public override getName(): string {
        return 'help';
    }
    
    public override getDescription(): string {
        return 'Prints help about all the commands or of specified command';
    }

    public override getUsage(): string {
        return 'help -p <page> [command]';
    }

    public override execute(args: Array<string>): void {
        const instance: CommandProcessor = CommandProcessor.getInstance();
        
        let page: number = 0;
        if (args.length >= 1) {
            const argParam = args[0];
            if (argParam === '-p') {
                if (args.length >= 2) {
                    const paramArg: string = args[1];
                    try {
                        page = parseInt(paramArg);
                    } catch (error) {
                        page = Number.NaN;
                    }

                    if (isNaN(page) || !isFinite(page)) {
                        this.logger.error(`Invalid page number provided: ${paramArg}`);
                        return;
                    }
                } else {
                    this.logger.warn(`Missing page number argument (help -p <here>)`);
                    return;
                }
            } else {
                const command: Command|null = instance.getCommand(argParam);
                if (!command) {
                    this.logger.error(`No such command: ${argParam}`);
                    return;
                }

                this.logger.info(`${command.getName()}: ${command.getUsage()}`);
                this.logger.info(`${command.getDescription()}`);
                return;
            }
        }
        
        const commands: {currentPage: number, maxPages: number, elements: Array<Command>}|null = instance.getCommands(page);
        if (!commands) {
            this.logger.error(`Cannot get commands page ${page}.`);
            return;
        }
       
        for (const command of commands.elements) {
            this.logger.info(`${command.getName()}: ${command.getUsage()}`);
            this.logger.info(`${command.getDescription()}`);
            this.logger.info('');
        }

        this.logger.info(`Page: ${commands.currentPage} | ${commands.maxPages}`);
    }
}