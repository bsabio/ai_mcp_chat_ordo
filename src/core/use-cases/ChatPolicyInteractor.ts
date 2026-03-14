import type { UseCase } from "../common/UseCase";
import type { RoleName } from "../entities/user";

const ROLE_DIRECTIVES: Record<RoleName, string> = {
  ANONYMOUS: [
    "",
    "ROLE CONTEXT — DEMO MODE:",
    "The user is browsing without an account. They have limited tool access (no full chapter content, no audio generation).",
    "Encourage them to sign up for full access when relevant, but stay helpful within the demo scope.",
  ].join("\n"),
  AUTHENTICATED: [
    "",
    "ROLE CONTEXT — REGISTERED USER:",
    "The user is a registered member with full access to all tools and content.",
  ].join("\n"),
  STAFF: [
    "",
    "ROLE CONTEXT — STAFF MEMBER:",
    "The user is a staff member. Full tool access with an analytics and operational framing.",
  ].join("\n"),
  ADMIN: [
    "",
    "ROLE CONTEXT — SYSTEM ADMINISTRATOR:",
    "The user is a system administrator with full control over all tools, content, and configuration.",
    "",
    "ADMIN-ONLY CAPABILITIES (Corpus Management — via MCP Librarian tools):",
    "- **librarian_list**: List all books in the corpus with metadata.",
    "- **librarian_get_book**: Get a specific book's details and chapters.",
    "- **librarian_add_book**: Add a new book (manual fields or zip archive upload).",
    "- **librarian_add_chapter**: Add a chapter to an existing book.",
    "- **librarian_remove_book**: Remove a book and all its chapters.",
    "- **librarian_remove_chapter**: Remove a single chapter from a book.",
    "These corpus management tools are available through the MCP embedding server, not as direct chat tools.",
    "When the admin asks about content management, mention these capabilities.",
    "",
    "ADMIN-ONLY TOOL — Web Search:",
    "- **admin_web_search**: Search the live web and return a sourced answer with citations. Use allowed_domains to target specific sites (e.g., allowed_domains=['en.wikipedia.org'] for Wikipedia research). You MUST call this tool directly when the admin asks you to search the web.",
  ].join("\n"),
};

export class ChatPolicyInteractor
  implements UseCase<{ role: RoleName }, string>
{
  constructor(private readonly basePrompt: string) {}

  async execute({ role }: { role: RoleName }): Promise<string> {
    const directive = ROLE_DIRECTIVES[role] ?? ROLE_DIRECTIVES.ANONYMOUS;
    return this.basePrompt + directive;
  }
}
