/**
 * Core Command Interface (GoF Command Pattern)
 * 
 * Encapsulates a request as an object, thereby letting us 
 * parameterize clients with different requests.
 */
export interface Command {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly icon?: string;
  readonly aliases?: readonly string[];
  execute(context?: unknown): void | Promise<unknown>;
}
