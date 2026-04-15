import type { ToolBundleDescriptor } from "@/core/tool-registry/ToolBundleDescriptor";
import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { projectCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-binding";
import {
  getJobQueueRepository,
  getUserFileDataMapper,
} from "@/adapters/RepositoryFactory";
import {
  createRegisteredToolBundle,
  registerToolBundle,
  type ToolBundleRegistration,
} from "./bundle-registration";

interface MediaToolRegistrationDeps {
  readonly jobQueueRepository: ReturnType<typeof getJobQueueRepository>;
  readonly userFileRepository: ReturnType<typeof getUserFileDataMapper>;
}

const MEDIA_TOOL_REGISTRATIONS = [
  {
    toolName: "compose_media",
    createTool: ({ jobQueueRepository }) =>
      projectCatalogBoundToolDescriptor("compose_media", { jobQueueRepository }),
  },
  {
    toolName: "generate_audio",
    createTool: () => projectCatalogBoundToolDescriptor("generate_audio"),
  },
  {
    toolName: "generate_chart",
    createTool: () => projectCatalogBoundToolDescriptor("generate_chart"),
  },
  {
    toolName: "generate_graph",
    createTool: () => projectCatalogBoundToolDescriptor("generate_graph"),
  },
  {
    toolName: "list_conversation_media_assets",
    createTool: ({ userFileRepository }) =>
      projectCatalogBoundToolDescriptor("list_conversation_media_assets", { userFileRepository }),
  },
] as const satisfies readonly ToolBundleRegistration<
  | "compose_media"
  | "generate_audio"
  | "generate_chart"
  | "generate_graph"
  | "list_conversation_media_assets",
  MediaToolRegistrationDeps
>[];

export const MEDIA_BUNDLE: ToolBundleDescriptor = createRegisteredToolBundle(
  "media",
  "Media Tools",
  MEDIA_TOOL_REGISTRATIONS,
);

export function registerMediaTools(registry: ToolRegistry): void {
  registerToolBundle(registry, MEDIA_TOOL_REGISTRATIONS, {
    jobQueueRepository: getJobQueueRepository(),
    userFileRepository: getUserFileDataMapper(),
  });
}
