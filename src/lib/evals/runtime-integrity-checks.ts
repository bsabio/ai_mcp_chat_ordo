export interface CanonicalCorpusSearchPayload {
  groundingState: string;
  followUp: string;
  results: Array<{
    documentSlug: string;
    sectionSlug: string;
    canonicalPath: string;
    resolverPath: string;
  }>;
  prefetchedSection: {
    canonicalPath: string;
  } | null;
}

export interface CanonicalCorpusSearchEvaluation {
  canonicalPathsReturned: boolean;
  resolverPathsReturned: boolean;
  groundingFollowupHonest: boolean;
  matchedExpected: boolean;
}

export interface RuntimeSelfKnowledgeInspectionPayload {
  toolCount: number;
  currentPathname: string | null;
  currentPage?: {
    label?: string | null;
    title?: string | null;
    mainHeading?: string | null;
  } | null;
}

export interface RuntimeSelfKnowledgeEvaluation {
  verifiedToolsReported: boolean;
  pageContextReported: boolean;
  matchedExpected: boolean;
  expectedPageTokens: string[];
}

function normalizeComparableText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesComparable(text: string, fragment: string): boolean {
  return normalizeComparableText(text).includes(normalizeComparableText(fragment));
}

export function evaluateCanonicalCorpusSearchPayload(
  payload: CanonicalCorpusSearchPayload,
): CanonicalCorpusSearchEvaluation {
  const canonicalPathsReturned = payload.results.length > 0
    && payload.results.every((result) =>
      result.canonicalPath.startsWith("/library/")
      && result.canonicalPath.endsWith(`/${result.sectionSlug}`)
      && result.canonicalPath.includes(`/${result.documentSlug}/`));
  const resolverPathsReturned = payload.results.length > 0
    && payload.results.every((result) => result.resolverPath === `/library/section/${result.sectionSlug}`);
  const groundingFollowupHonest = (
    payload.groundingState === "prefetched_section"
    && payload.followUp === "cite_canonical_paths"
    && payload.prefetchedSection?.canonicalPath === payload.results[0]?.canonicalPath
  ) || (
    payload.groundingState === "search_only"
    && payload.followUp === "call_get_section_before_detailed_claims"
    && payload.prefetchedSection === null
  );

  return {
    canonicalPathsReturned,
    resolverPathsReturned,
    groundingFollowupHonest,
    matchedExpected: canonicalPathsReturned && resolverPathsReturned && groundingFollowupHonest,
  };
}

export function evaluateRuntimeSelfKnowledgeAnswer(
  assistantText: string,
  inspectedRuntime: RuntimeSelfKnowledgeInspectionPayload | null | undefined,
): RuntimeSelfKnowledgeEvaluation {
  const toolCountMentioned = typeof inspectedRuntime?.toolCount === "number"
    && new RegExp(`\\b${inspectedRuntime.toolCount}\\b`).test(assistantText);
  const toolContextMentioned = /(tool|capabilit|available tools?)/i.test(assistantText);
  const expectedPageTokens = Array.from(new Set([
    inspectedRuntime?.currentPathname,
    inspectedRuntime?.currentPage?.mainHeading,
    inspectedRuntime?.currentPage?.title,
    inspectedRuntime?.currentPage?.label,
  ].filter((token): token is string => typeof token === "string" && token.trim().length > 0)));
  const pageContextReported = expectedPageTokens.length > 0
    && expectedPageTokens.some((token) => includesComparable(assistantText, token));
  const verifiedToolsReported = Boolean(inspectedRuntime) && toolCountMentioned && toolContextMentioned;

  return {
    verifiedToolsReported,
    pageContextReported,
    matchedExpected: verifiedToolsReported && pageContextReported,
    expectedPageTokens,
  };
}