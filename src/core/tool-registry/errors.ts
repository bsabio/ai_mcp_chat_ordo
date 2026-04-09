import { ForbiddenError, NotFoundError } from "@/core/common/errors";

export class ToolAccessDeniedError extends ForbiddenError {
  readonly toolName: string;
  readonly role: string;

  constructor(toolName: string, role: string) {
    super(`Access denied: role "${role}" cannot execute tool "${toolName}"`);
    this.toolName = toolName;
    this.role = role;
  }
}

export class UnknownToolError extends NotFoundError {
  readonly toolName: string;

  constructor(toolName: string) {
    super(`Unknown tool: "${toolName}"`);
    this.toolName = toolName;
  }
}
