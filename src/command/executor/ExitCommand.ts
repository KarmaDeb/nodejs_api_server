import Command from "../Command";

export default class ExitCommand extends Command {

    public override getName(): string {
        return 'exit';
    }

    public override getDescription(): string {
        return 'Exits the application';
    }

    public override getUsage(): string {
        return 'exit [cause]';
    }
    
    public override execute(args: Array<string>): void {
        if (args.length >= 1) {
            const reason: string = args.join(' ');
            this.logger.warn(`Exiting application (Reason: ${reason})`);
        }
        
        process.exit(0);
    }
}