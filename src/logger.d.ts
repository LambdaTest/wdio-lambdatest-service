import { Logger } from "winston";

/**
 * Creates and configures a Winston logger.
 * If LT_API_LOG environment variable is set to "true", it logs to a file named as per the `logFile` parameter or defaults to "lambda_api.log".
 * Otherwise, it creates a silent logger that doesn't log to any file but is still operational for logging methods.
 * @param logFile Optional. The name of the log file to write to. Defaults to "lambda_api.log" if not provided.
 * @returns Configured Winston logger instance.
 */
export declare function logging(logFile?: string): Logger;
