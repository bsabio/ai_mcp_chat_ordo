export class ToolAccessDeniedError extends Error {
  readonly toolName: string;
  readonly role: string;

  constructor(toolName: string, role: string) {
    super(`Access denied: role "${role}" cannot execute tool "${toolName}"`);
    this.name = "ToolAccessDeniedError";
    this.toolName = toolName;
    this.role = role;
  }
}

export class UnknownToolError extends Error {
  readonly toolName: string;

  constructor(toolName: string) {
    super(`Unknown tool: "${toolName}"`);
    this.name = "UnknownToolError";
    this.toolName = toolName;
  }
}
