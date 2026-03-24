import * as path from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getDb } from "@/lib/db";
import { FileSystemCorpusRepository } from "@/adapters/FileSystemCorpusRepository";
import { CachedCorpusRepository } from "@/adapters/CachedCorpusRepository";
import { LocalEmbedder } from "@/adapters/LocalEmbedder";
import { SQLiteVectorStore } from "@/adapters/SQLiteVectorStore";
import { SQLiteBM25IndexStore } from "@/adapters/SQLiteBM25IndexStore";
import { EmbeddingPipelineFactory } from "@/core/search/EmbeddingPipelineFactory";
import { BM25Scorer } from "@/core/search/BM25Scorer";
import { QueryProcessor } from "@/core/search/QueryProcessor";
import { LowercaseStep } from "@/core/search/query-steps/LowercaseStep";
import { StopwordStep } from "@/core/search/query-steps/StopwordStep";
import { SynonymStep } from "@/core/search/query-steps/SynonymStep";
import { HybridSearchEngine } from "@/core/search/HybridSearchEngine";
import {
  HybridSearchHandler,
  BM25SearchHandler,
  LegacyKeywordHandler,
  EmptyResultHandler,
} from "@/core/search/SearchHandlerChain";
import { STOPWORDS } from "@/core/search/data/stopwords";
import { SYNONYMS } from "@/core/search/data/synonyms";
import type { EmbeddingToolDeps } from "./embedding-tool";
import {
  embedText,
  embedDocument,
  searchSimilar,
  rebuildIndex,
  getIndexStats,
  deleteEmbeddings,
} from "./embedding-tool";
import type { CorpusToolDeps } from "./librarian-tool";
import {
  corpusList,
  corpusGetDocument,
  corpusAddDocument,
  corpusAddSection,
  corpusRemoveDocument,
  corpusRemoveSection,
} from "./librarian-tool";
import type { PromptToolDeps } from "./prompt-tool";
import {
  promptList,
  promptGet,
  promptSet,
  promptRollback,
  promptDiff,
} from "./prompt-tool";
import type { AnalyticsToolDeps } from "./analytics-tool";
import {
  conversationAnalytics,
  conversationInspect,
  conversationCohort,
} from "./analytics-tool";
import { SystemPromptDataMapper } from "@/adapters/SystemPromptDataMapper";
import { ConversationEventDataMapper } from "@/adapters/ConversationEventDataMapper";
import { ConversationEventRecorder } from "@/core/use-cases/ConversationEventRecorder";
import { corpusConfig } from "@/lib/corpus-vocabulary";

const MODEL_VERSION = "all-MiniLM-L6-v2@1.0";

interface AllDeps {
  embedding: EmbeddingToolDeps;
  librarian: CorpusToolDeps;
  prompt: PromptToolDeps;
  analytics: AnalyticsToolDeps;
}

function buildDeps(): AllDeps {
  const db = getDb();
  const embedder = new LocalEmbedder();
  const vectorStore = new SQLiteVectorStore(db);
  const bm25IndexStore = new SQLiteBM25IndexStore(db);

  // Build repo graph directly to capture concrete types for cache clearing
  const fsRepo = new FileSystemCorpusRepository();
  const cached = new CachedCorpusRepository(fsRepo);
  const corpusRepo = cached;

  const pipelineFactory = new EmbeddingPipelineFactory(
    embedder,
    vectorStore,
    MODEL_VERSION,
  );

  const bm25Scorer = new BM25Scorer();
  const vectorProcessor = new QueryProcessor([
    new LowercaseStep(),
    new StopwordStep(STOPWORDS),
  ]);
  const bm25Processor = new QueryProcessor([
    new LowercaseStep(),
    new StopwordStep(STOPWORDS),
    new SynonymStep(SYNONYMS),
  ]);
  const engine = new HybridSearchEngine(
    embedder,
    vectorStore,
    bm25Scorer,
    bm25IndexStore,
    vectorProcessor,
    bm25Processor,
    { vectorTopN: 50, bm25TopN: 50, rrfK: 60, maxResults: 10 },
  );
  const hybrid = new HybridSearchHandler(engine, embedder, bm25IndexStore, corpusConfig.sourceType);
  const bm25 = new BM25SearchHandler(
    bm25Scorer,
    bm25IndexStore,
    vectorStore,
    bm25Processor,
    corpusConfig.sourceType,
  );
  const legacy = new LegacyKeywordHandler(corpusRepo);
  const empty = new EmptyResultHandler();
  hybrid.setNext(bm25);
  bm25.setNext(legacy);
  legacy.setNext(empty);

  return {
    embedding: {
      embedder,
      vectorStore,
      bm25IndexStore,
      searchHandler: hybrid,
      pipelineFactory,
      corpusRepo,
    },
    librarian: {
      corpusDir: path.resolve(process.cwd(), "docs/_corpus"),
      vectorStore,
      clearCaches: () => {
        cached.clearCache();
        fsRepo.clearDiscoveryCache();
      },
    },
    prompt: {
      promptRepo: new SystemPromptDataMapper(db),
      eventRecorder: new ConversationEventRecorder(new ConversationEventDataMapper(db)),
      findActiveConversationIds: async (role: string): Promise<string[]> => {
        if (role === "ALL") {
          const rows = db.prepare(`SELECT id FROM conversations WHERE status = 'active'`).all() as { id: string }[];
          return rows.map((r) => r.id);
        }
        if (role === "ANONYMOUS") {
          const rows = db.prepare(`SELECT id FROM conversations WHERE status = 'active' AND user_id LIKE 'anon_%'`).all() as { id: string }[];
          return rows.map((r) => r.id);
        }
        const rows = db.prepare(
          `SELECT c.id FROM conversations c
           JOIN user_roles ur ON c.user_id = ur.user_id
           JOIN roles r ON ur.role_id = r.id
           WHERE c.status = 'active' AND r.name = ?`
        ).all(role) as { id: string }[];
        return rows.map((r) => r.id);
      },
    },
    analytics: {
      db,
    },
  };
}

let deps: AllDeps | null = null;
function getDeps(): AllDeps {
  if (!deps) deps = buildDeps();
  return deps;
}

const server = new Server(
  { name: "embedding-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "embed_text",
      description: "Embed arbitrary text, return vector dimensions and preview.",
      inputSchema: {
        type: "object" as const,
        properties: {
          text: { type: "string", description: "Text to embed." },
        },
        required: ["text"],
        additionalProperties: false,
      },
    },
    {
      name: "embed_document",
      description:
        "Chunk, embed, and store a document into the vector store.",
      inputSchema: {
        type: "object" as const,
        properties: {
          source_type: {
            type: "string",
            description: `Source type (e.g. '${corpusConfig.sourceType}').`,
          },
          source_id: {
            type: "string",
            description: "Source ID (e.g. 'book-slug/chapter-slug').",
          },
          content: {
            type: "string",
            description: "Document content to embed.",
          },
        },
        required: ["source_type", "source_id", "content"],
        additionalProperties: false,
      },
    },
    {
      name: "search_similar",
      description: "Hybrid similarity search (BM25 + vector + RRF).",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "Search query." },
          source_type: {
            type: "string",
            description: "Filter by source type.",
          },
          limit: { type: "number", description: "Max results." },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      name: "rebuild_index",
      description:
        "Full or incremental rebuild of embeddings for a source type.",
      inputSchema: {
        type: "object" as const,
        properties: {
          source_type: {
            type: "string",
            description: `Source type to rebuild (e.g. '${corpusConfig.sourceType}').`,
          },
          force: {
            type: "boolean",
            description: "Force full rebuild (delete existing first).",
          },
        },
        required: ["source_type"],
        additionalProperties: false,
      },
    },
    {
      name: "get_index_stats",
      description: "Embedding counts, BM25 stats, model readiness.",
      inputSchema: {
        type: "object" as const,
        properties: {
          source_type: {
            type: "string",
            description: "Source type filter.",
          },
        },
        additionalProperties: false,
      },
    },
    {
      name: "delete_embeddings",
      description: "Remove all embeddings for a specific source ID.",
      inputSchema: {
        type: "object" as const,
        properties: {
          source_id: {
            type: "string",
            description: "Source ID to delete.",
          },
        },
        required: ["source_id"],
        additionalProperties: false,
      },
    },
    // --- Librarian tools ---
    {
      name: "corpus_list",
      description:
        "List all documents in the corpus with section counts and indexing status.",
      inputSchema: {
        type: "object" as const,
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "corpus_get",
      description:
        "Get details of a corpus document including its sections.",
      inputSchema: {
        type: "object" as const,
        properties: {
          slug: { type: "string", description: "Document slug." },
        },
        required: ["slug"],
        additionalProperties: false,
      },
    },
    {
      name: "corpus_add_document",
      description:
        "Add a new document to the corpus. Provide slug/title/number/sortOrder/domain/chapters, OR a base64-encoded zip archive containing book.json and chapters/.",
      inputSchema: {
        type: "object" as const,
        properties: {
          slug: {
            type: "string",
            description:
              "Document slug (lowercase kebab-case). Becomes the directory name.",
          },
          title: { type: "string", description: "Document title." },
          number: {
            type: "string",
            description: "Display number (e.g. 'XI'). Decorative only.",
          },
          sortOrder: { type: "number", description: "Numeric sort order." },
          domain: {
            type: "array",
            description:
              "Content domains (e.g. ['teaching', 'reference']).",
            items: { type: "string" },
          },
          tags: {
            type: "array",
            description:
              "Optional freeform tags (lowercase kebab-case).",
            items: { type: "string" },
          },
          chapters: {
            type: "array",
            description: "Array of {slug, content} section objects.",
            items: {
              type: "object",
              properties: {
                slug: { type: "string" },
                content: { type: "string" },
              },
              required: ["slug", "content"],
            },
          },
          zip_base64: {
            type: "string",
            description:
              "Base64-encoded zip archive containing book.json and chapters/. If provided, all other fields are ignored.",
          },
        },
        additionalProperties: false,
      },
    },
    {
      name: "corpus_add_section",
      description:
        "Add a section to an existing document in the corpus. Overwrites if the section already exists.",
      inputSchema: {
        type: "object" as const,
        properties: {
          book_slug: {
            type: "string",
            description: "Slug of the target document.",
          },
          chapter_slug: {
            type: "string",
            description: "Section slug (becomes filename).",
          },
          content: {
            type: "string",
            description: "Section markdown content.",
          },
        },
        required: ["book_slug", "chapter_slug", "content"],
        additionalProperties: false,
      },
    },
    {
      name: "corpus_remove_document",
      description:
        "Remove a document and all its embeddings from the corpus.",
      inputSchema: {
        type: "object" as const,
        properties: {
          slug: {
            type: "string",
            description: "Document slug to remove.",
          },
        },
        required: ["slug"],
        additionalProperties: false,
      },
    },
    {
      name: "corpus_remove_section",
      description:
        "Remove a single section and its embeddings from a document.",
      inputSchema: {
        type: "object" as const,
        properties: {
          book_slug: { type: "string", description: "Document slug." },
          chapter_slug: {
            type: "string",
            description: "Section slug to remove.",
          },
        },
        required: ["book_slug", "chapter_slug"],
        additionalProperties: false,
      },
    },
    // --- Prompt management tools ---
    {
      name: "prompt_list",
      description: "List all system prompt versions, optionally filtered by role and/or prompt_type.",
      inputSchema: {
        type: "object" as const,
        properties: {
          role: { type: "string", description: "Filter by role (e.g. 'ALL', 'ANONYMOUS', 'ADMIN')." },
          prompt_type: { type: "string", description: "Filter by type ('base' or 'role_directive')." },
        },
        additionalProperties: false,
      },
    },
    {
      name: "prompt_get",
      description: "Get a specific system prompt. Returns the active version by default, or a specific version if provided.",
      inputSchema: {
        type: "object" as const,
        properties: {
          role: { type: "string", description: "Prompt role." },
          prompt_type: { type: "string", description: "Prompt type ('base' or 'role_directive')." },
          version: { type: "number", description: "Specific version number (omit for active)." },
        },
        required: ["role", "prompt_type"],
        additionalProperties: false,
      },
    },
    {
      name: "prompt_set",
      description: "Create a new prompt version and immediately activate it. The previous active version is retained.",
      inputSchema: {
        type: "object" as const,
        properties: {
          role: { type: "string", description: "Prompt role." },
          prompt_type: { type: "string", description: "Prompt type ('base' or 'role_directive')." },
          content: { type: "string", description: "Full prompt text." },
          notes: { type: "string", description: "Explanation of why this change was made." },
        },
        required: ["role", "prompt_type", "content", "notes"],
        additionalProperties: false,
      },
    },
    {
      name: "prompt_rollback",
      description: "Reactivate a previous prompt version.",
      inputSchema: {
        type: "object" as const,
        properties: {
          role: { type: "string", description: "Prompt role." },
          prompt_type: { type: "string", description: "Prompt type ('base' or 'role_directive')." },
          version: { type: "number", description: "Version number to reactivate." },
        },
        required: ["role", "prompt_type", "version"],
        additionalProperties: false,
      },
    },
    {
      name: "prompt_diff",
      description: "Line-by-line diff between two prompt versions.",
      inputSchema: {
        type: "object" as const,
        properties: {
          role: { type: "string", description: "Prompt role." },
          prompt_type: { type: "string", description: "Prompt type ('base' or 'role_directive')." },
          version_a: { type: "number", description: "First version to compare." },
          version_b: { type: "number", description: "Second version to compare." },
        },
        required: ["role", "prompt_type", "version_a", "version_b"],
        additionalProperties: false,
      },
    },
    {
      name: "conversation_analytics",
      description: "Aggregate conversation analytics for overview, funnel, engagement, tool usage, drop-off review, and routing review queues.",
      inputSchema: {
        type: "object" as const,
        properties: {
          metric: {
            type: "string",
            description: "Analytics metric: overview, funnel, engagement, tool_usage, drop_off, or routing_review.",
          },
          time_range: {
            type: "string",
            description: "Time window: 24h, 7d, 30d, or all.",
          },
          limit: {
            type: "number",
            description: "Optional per-queue limit for routing_review results.",
          },
        },
        required: ["metric"],
        additionalProperties: false,
      },
    },
    {
      name: "conversation_inspect",
      description: "Inspect one conversation or the most recent conversations for a user, with previews and event timeline.",
      inputSchema: {
        type: "object" as const,
        properties: {
          conversation_id: { type: "string", description: "Conversation ID to inspect." },
          user_id: { type: "string", description: "User ID to inspect if conversation_id is omitted." },
          limit: { type: "number", description: "Max conversations to return when using user_id." },
        },
        additionalProperties: false,
      },
    },
    {
      name: "conversation_cohort",
      description: "Compare two cohorts across message count, tool usage, session duration, or return rate.",
      inputSchema: {
        type: "object" as const,
        properties: {
          cohort_a: { type: "string", description: "First cohort: anonymous, authenticated, or converted." },
          cohort_b: { type: "string", description: "Second cohort: anonymous, authenticated, or converted." },
          metric: { type: "string", description: "Comparison metric: message_count, tool_usage, session_duration, or return_rate." },
        },
        required: ["cohort_a", "cohort_b", "metric"],
        additionalProperties: false,
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const d = getDeps();
  const a = (args ?? {}) as Record<string, unknown>;

  let result: unknown;
  switch (name) {
    case "embed_text":
      result = await embedText(d.embedding, a as { text: string });
      break;
    case "embed_document":
      result = await embedDocument(
        d.embedding,
        a as { source_type: string; source_id: string; content: string },
      );
      break;
    case "search_similar":
      result = await searchSimilar(
        d.embedding,
        a as { query: string; source_type?: string; limit?: number },
      );
      break;
    case "rebuild_index":
      result = await rebuildIndex(
        d.embedding,
        a as { source_type: string; force?: boolean },
      );
      break;
    case "get_index_stats":
      result = getIndexStats(d.embedding, a as { source_type?: string });
      break;
    case "delete_embeddings":
      result = deleteEmbeddings(d.embedding, a as { source_id: string });
      break;
    // --- Librarian tools ---
    case "corpus_list":
    case "librarian_list":
      result = await corpusList(d.librarian);
      break;
    case "corpus_get":
    case "librarian_get_book":
      result = await corpusGetDocument(
        d.librarian,
        a as { slug: string },
      );
      break;
    case "corpus_add_document":
    case "librarian_add_book":
      result = await corpusAddDocument(
        d.librarian,
        a as {
          slug?: string;
          title?: string;
          number?: string;
          sortOrder?: number;
          domain?: string[];
          tags?: string[];
          chapters?: Array<{ slug: string; content: string }>;
          zip_base64?: string;
        },
      );
      break;
    case "corpus_add_section":
    case "librarian_add_chapter":
      result = await corpusAddSection(
        d.librarian,
        a as { book_slug: string; chapter_slug: string; content: string },
      );
      break;
    case "corpus_remove_document":
    case "librarian_remove_book":
      result = await corpusRemoveDocument(
        d.librarian,
        a as { slug: string },
      );
      break;
    case "corpus_remove_section":
    case "librarian_remove_chapter":
      result = await corpusRemoveSection(
        d.librarian,
        a as { book_slug: string; chapter_slug: string },
      );
      break;
    // --- Prompt management tools ---
    case "prompt_list":
      result = await promptList(d.prompt, a as { role?: string; prompt_type?: string });
      break;
    case "prompt_get":
      result = await promptGet(d.prompt, a as { role: string; prompt_type: string; version?: number });
      break;
    case "prompt_set":
      result = await promptSet(d.prompt, a as { role: string; prompt_type: string; content: string; notes: string });
      break;
    case "prompt_rollback":
      result = await promptRollback(d.prompt, a as { role: string; prompt_type: string; version: number });
      break;
    case "prompt_diff":
      result = await promptDiff(d.prompt, a as { role: string; prompt_type: string; version_a: number; version_b: number });
      break;
    case "conversation_analytics":
      result = await conversationAnalytics(d.analytics, a as {
        metric: "overview" | "funnel" | "engagement" | "tool_usage" | "drop_off" | "routing_review";
        time_range?: "24h" | "7d" | "30d" | "all";
        limit?: number;
      });
      break;
    case "conversation_inspect":
      result = await conversationInspect(d.analytics, a as {
        conversation_id?: string;
        user_id?: string;
        limit?: number;
      });
      break;
    case "conversation_cohort":
      result = await conversationCohort(d.analytics, a as {
        cohort_a: "anonymous" | "authenticated" | "converted";
        cohort_b: "anonymous" | "authenticated" | "converted";
        metric: "message_count" | "tool_usage" | "session_duration" | "return_rate";
      });
      break;
    default:
      throw new Error(`Unknown tool: ${name}`);
  }

  return {
    content: [{ type: "text", text: JSON.stringify(result) }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
