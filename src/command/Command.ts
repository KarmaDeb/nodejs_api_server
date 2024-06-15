import type { Logger } from "winston";

/**
 * Command
 */
export default abstract class Command {

    protected readonly logger: Logger;

    public constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Get the command name
     */
    public abstract getName(): string;

    /**
     * Get the command description
     */
    public abstract getDescription(): string;

    /**
     * Get the command usage
     */
    public abstract getUsage(): string;

    /**
     * Execute the command
     * @param args the command arguments
     */
    public abstract execute(args: Array<string>): void;
}