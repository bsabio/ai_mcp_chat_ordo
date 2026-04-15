#!/usr/bin/env tsx
import fs from "node:fs/promises";
import path from "node:path";

import { getCorpusRepository } from "@/adapters/RepositoryFactory";
import { classifyChunkBoundarySource, MarkdownChunker } from "@/core/search/MarkdownChunker";
import type { Chunk, DocumentChunkMetadata } from "@/core/search/ports/Chunker";
import { GetSectionCommand, SearchCorpusCommand } from "@/core/use-cases/tools/CorpusTools";
import type { RoleName } from "@/core/entities/user";
import { getSearchHandler } from "@/lib/chat/search-pipeline";
import { corpusConfig } from "@/lib/corpus-vocabulary";

const OUTPUT_DIR = path.join(
  process.cwd(),
  "docs/_refactor/agent-session-value-and-retrieval-calibration/artifacts",
);

type BenchmarkCase = {
  id: string;
  label: string;
  bookSlug: string;
  sectionSlug: string;
  queries: string[];
};

type SearchResultItem = {
  section: string;
  canonicalPath: string | null;
  resolverPath: string | null;
  fallbackSearchPath: string | null;
  fallbackSearchQuery: string | null;
  relevance: string;
  rrfScore: number | null;
  vectorRank: number | null;
  bm25Rank: number | null;
  matchContextPreview: string | null;
  matchPassagePreview: string | null;
  matchSection: string | null;
  chunkMetadata: {
    chunkId: string | null;
    chunkLevel: string | null;
    localChunkIndex: number | null;
    localChunkCount: number | null;
    parentChunkId: string | null;
    previousChunkId: string | null;
    nextChunkId: string | null;
    boundarySource: string | null;
    conceptKeywords: string[];
  } | null;
};

type SearchPayloadSnapshot = {
  query: string;
  backend: string;
  fallbackError: string | null;
  groundingState: string;
  followUp: string;
  retrievalQuality: string;
  resultCount: number;
  results: SearchResultItem[];
  prefetchedSection: {
    title: string;
    canonicalPath: string;
    resolverPath: string;
    contentPreview: string;
    contentLength: number;
    contentTruncated: boolean;
  } | null;
};

type QueryBenchmarkRun = {
  query: string;
  backend: string;
  fallbackError: string | null;
  groundingState: string;
  followUp: string;
  retrievalQuality: string;
  expectedHitRank: number | null;
  topHitCanonicalPath: string | null;
  top3CanonicalPaths: string[];
  results: SearchResultItem[];
};

const BENCHMARK_CASES: readonly BenchmarkCase[] = [
  {
    id: "archetype-definition",
    label: "Archetype definition",
    bookSlug: "archetype-atlas",
    sectionSlug: "ch01-what-an-archetype-is",
    queries: [
      "what is an archetype",
      "define archetype",
      "archetype meaning",
      "how should i think about archetypes",
      "archetype framework definition",
    ],
  },
  {
    id: "llm-application-engineering",
    label: "LLM application engineering",
    bookSlug: "building-ai-native-systems",
    sectionSlug: "ch01-llm-application-engineering",
    queries: [
      "what is llm application engineering",
      "building an llm application",
      "application engineering for language models",
      "ai-native application engineering",
      "shipping production llm systems",
    ],
  },
  {
    id: "trivium-quadrivium",
    label: "Updated trivium and quadrivium",
    bookSlug: "curriculum-architecture",
    sectionSlug: "ch01-trivium-quadrivium",
    queries: [
      "updated trivium and quadrivium",
      "formation model for the ai era",
      "curriculum trivium quadrivium",
      "modern trivium quadrivium model",
      "classical formation for ai builders",
    ],
  },
  {
    id: "whole-person-formation",
    label: "Whole-person formation",
    bookSlug: "formation-and-governance",
    sectionSlug: "ch01-whole-person-formation",
    queries: [
      "whole-person formation",
      "formation versus content delivery",
      "educating the whole person",
      "formation and governance curriculum",
      "whole person education model",
    ],
  },
  {
    id: "one-line-system",
    label: "The one-line system",
    bookSlug: "identity-system",
    sectionSlug: "ch01-the-one-line-system",
    queries: [
      "what is the one-line system",
      "one line system identity",
      "identity one-line system",
      "one-line identity framework",
      "how the one line system works",
    ],
  },
  {
    id: "first-second-visual-judgment",
    label: "First-second visual judgment",
    bookSlug: "perception-visual-intelligence",
    sectionSlug: "ch01-what-happens-in-the-first-second",
    queries: [
      "what happens in the first second",
      "first second visual judgment",
      "initial visual impression",
      "first-second perception model",
      "how visual judgment starts",
    ],
  },
  {
    id: "printing-press-analogy",
    label: "Printing press analogy",
    bookSlug: "second-renaissance",
    sectionSlug: "ch01-why-now",
    queries: [
      "printing press analogy",
      "why now printing press",
      "ai and the printing press",
      "second renaissance printing press comparison",
      "historical analogy for ai transition",
    ],
  },
  {
    id: "portfolio-as-product",
    label: "Portfolio as product",
    bookSlug: "signal-and-deployment",
    sectionSlug: "ch01-portfolio-as-product",
    queries: [
      "portfolio as product",
      "portfolio not homework",
      "turn portfolio into a product",
      "portfolio as deployed signal",
      "why portfolio should be productized",
    ],
  },
  {
    id: "eisenstein-print-economy",
    label: "Eisenstein and print economics",
    bookSlug: "sources-and-lineage",
    sectionSlug: "ch01-eisenstein",
    queries: [
      "Elizabeth Eisenstein printing press",
      "Eisenstein information economy",
      "print revolution information economy",
      "Eisenstein on print economics",
      "information economics of print",
    ],
  },
  {
    id: "trust-is-not-a-mood",
    label: "Trust is not a mood",
    bookSlug: "trust-proof-persuasion",
    sectionSlug: "ch01-trust-is-not-a-mood",
    queries: [
      "trust is not a mood",
      "how trust works structurally",
      "trust proof persuasion",
      "trust as structural proof",
      "what makes trust legible",
    ],
  },
];

function countWords(text: string): number {
  return text.split(/\s+/u).filter(Boolean).length;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function preview(text: string | null | undefined, maxLength = 220): string | null {
  if (!text) {
    return null;
  }

  const normalized = text.replace(/\s+/gu, " ").trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
}

function summarizeCounts(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((summary, value) => {
    summary[value] = (summary[value] ?? 0) + 1;
    return summary;
  }, {});
}

function hasOverlap(left: Chunk, right: Chunk): boolean {
  return left.startOffset < right.endOffset && right.startOffset < left.endOffset;
}

function buildCanonicalPath(bookSlug: string, sectionSlug: string): string {
  return `/library/${bookSlug}/${sectionSlug}`;
}

function serializeChunkMetadata(value: unknown): SearchResultItem["chunkMetadata"] {
  if (!value || typeof value !== "object") {
    return null;
  }

  const metadata = value as Record<string, unknown>;
  return {
    chunkId: typeof metadata.chunkId === "string" ? metadata.chunkId : null,
    chunkLevel: typeof metadata.chunkLevel === "string" ? metadata.chunkLevel : null,
    localChunkIndex: typeof metadata.localChunkIndex === "number" ? metadata.localChunkIndex : null,
    localChunkCount: typeof metadata.localChunkCount === "number" ? metadata.localChunkCount : null,
    parentChunkId: typeof metadata.parentChunkId === "string" ? metadata.parentChunkId : null,
    previousChunkId: typeof metadata.previousChunkId === "string" ? metadata.previousChunkId : null,
    nextChunkId: typeof metadata.nextChunkId === "string" ? metadata.nextChunkId : null,
    boundarySource: typeof metadata.boundarySource === "string" ? metadata.boundarySource : null,
    conceptKeywords: Array.isArray(metadata.conceptKeywords)
      ? metadata.conceptKeywords.filter((keyword): keyword is string => typeof keyword === "string")
      : [],
  };
}

function serializeResultItem(result: Record<string, unknown>): SearchResultItem {
  return {
    section: typeof result.section === "string" ? result.section : "",
    canonicalPath: typeof result.canonicalPath === "string" ? result.canonicalPath : null,
    resolverPath: typeof result.resolverPath === "string" ? result.resolverPath : null,
    fallbackSearchPath: typeof result.fallbackSearchPath === "string" ? result.fallbackSearchPath : null,
    fallbackSearchQuery: typeof result.fallbackSearchQuery === "string" ? result.fallbackSearchQuery : null,
    relevance: typeof result.relevance === "string" ? result.relevance : "unknown",
    rrfScore: typeof result.rrfScore === "number" ? result.rrfScore : null,
    vectorRank: typeof result.vectorRank === "number" ? result.vectorRank : null,
    bm25Rank: typeof result.bm25Rank === "number" ? result.bm25Rank : null,
    matchContextPreview: preview(typeof result.matchContext === "string" ? result.matchContext : null),
    matchPassagePreview: preview(typeof result.matchPassage === "string" ? result.matchPassage : null),
    matchSection: typeof result.matchSection === "string" ? result.matchSection : null,
    chunkMetadata: serializeChunkMetadata(result.chunkMetadata),
  };
}

async function writeJsonArtifact(fileName: string, payload: unknown): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();
  const repository = getCorpusRepository();
  const searchHandler = getSearchHandler();
  const liveSearchCommand = new SearchCorpusCommand(repository, searchHandler);
  const legacySearchCommand = new SearchCorpusCommand(repository);
  const getSectionCommand = new GetSectionCommand(repository);
  const chunker = new MarkdownChunker();

  async function runSearch(query: string, role: RoleName): Promise<SearchPayloadSnapshot> {
    const context = { role, userId: "baseline-audit" };

    try {
      const payload = await liveSearchCommand.execute({ query, max_results: 3 }, context) as Record<string, unknown>;
      const prefetchedSection = payload.prefetchedSection as Record<string, unknown> | null | undefined;

      return {
        query,
        backend: "search_pipeline",
        fallbackError: null,
        groundingState: typeof payload.groundingState === "string" ? payload.groundingState : "unknown",
        followUp: typeof payload.followUp === "string" ? payload.followUp : "unknown",
        retrievalQuality: typeof payload.retrievalQuality === "string" ? payload.retrievalQuality : "unknown",
        resultCount: Array.isArray(payload.results) ? payload.results.length : 0,
        results: Array.isArray(payload.results)
          ? payload.results.map((result) => serializeResultItem(result as Record<string, unknown>))
          : [],
        prefetchedSection: prefetchedSection
          ? {
            title: typeof prefetchedSection.title === "string" ? prefetchedSection.title : "",
            canonicalPath:
              typeof prefetchedSection.canonicalPath === "string" ? prefetchedSection.canonicalPath : "",
            resolverPath:
              typeof prefetchedSection.resolverPath === "string" ? prefetchedSection.resolverPath : "",
            contentPreview: preview(
              typeof prefetchedSection.content === "string" ? prefetchedSection.content : "",
              320,
            ) ?? "",
            contentLength:
              typeof prefetchedSection.content === "string" ? prefetchedSection.content.length : 0,
            contentTruncated: prefetchedSection.contentTruncated === true,
          }
          : null,
      };
    } catch (error) {
      const payload = await legacySearchCommand.execute({ query, max_results: 3 }, context) as Record<string, unknown>;

      return {
        query,
        backend: "legacy_fallback",
        fallbackError: error instanceof Error ? error.message : String(error),
        groundingState: typeof payload.groundingState === "string" ? payload.groundingState : "unknown",
        followUp: typeof payload.followUp === "string" ? payload.followUp : "unknown",
        retrievalQuality: typeof payload.retrievalQuality === "string" ? payload.retrievalQuality : "unknown",
        resultCount: Array.isArray(payload.results) ? payload.results.length : 0,
        results: Array.isArray(payload.results)
          ? payload.results.map((result) => serializeResultItem(result as Record<string, unknown>))
          : [],
        prefetchedSection: null,
      };
    }
  }

  const documents = await repository.getAllDocuments();
  const sections = await repository.getAllSections();
  const documentTitleMap = new Map(documents.map((document) => [document.slug, document.title]));
  const documentIdMap = new Map(documents.map((document) => [document.slug, document.number]));

  const levelWordCounts: Record<Chunk["level"], number[]> = {
    document: [],
    section: [],
    passage: [],
  };
  const levelCounts: Record<Chunk["level"], number> = {
    document: 0,
    section: 0,
    passage: 0,
  };
  const boundarySourceCounts: Record<string, number> = {};
  const overlapBreakdown: Record<string, number> = {};
  const spanningCandidates: Array<{
    sourceId: string;
    sectionTitle: string;
    passageCount: number;
    overlappingPairs: number;
  }> = [];
  const metadataCoverage = {
    chunkIds: 0,
    adjacencyLinks: 0,
    boundarySources: 0,
    conceptKeywords: 0,
  };
  const conceptSpanSamples: Array<{
    sourceId: string;
    sectionTitle: string;
    keyword: string;
    chunkIds: string[];
    chunkLevels: Chunk["level"][];
    passageChunkIds: string[];
  }> = [];

  let totalChunks = 0;
  let totalOverlapPairs = 0;

  for (const section of sections) {
    const metadata: DocumentChunkMetadata = {
      sourceType: corpusConfig.sourceType,
      documentSlug: section.documentSlug,
      sectionSlug: section.sectionSlug,
      documentTitle: documentTitleMap.get(section.documentSlug) ?? section.documentSlug,
      documentId: documentIdMap.get(section.documentSlug) ?? section.documentSlug,
      sectionTitle: section.title,
      sectionFirstSentence: section.content.split(/[.!?]\s/u)[0]?.slice(0, 200) ?? "",
      bookSlug: section.documentSlug,
      chapterSlug: section.sectionSlug,
      bookTitle: documentTitleMap.get(section.documentSlug) ?? section.documentSlug,
      bookNumber: documentIdMap.get(section.documentSlug) ?? section.documentSlug,
      chapterTitle: section.title,
      chapterFirstSentence: section.content.split(/[.!?]\s/u)[0]?.slice(0, 200) ?? "",
    };

    const chunks = chunker.chunk(`${section.documentSlug}/${section.sectionSlug}`, section.content, metadata);
    const nonDocumentChunks = chunks.filter((chunk) => chunk.level !== "document");
    const passageCount = chunks.filter((chunk) => chunk.level === "passage").length;

    totalChunks += chunks.length;

    for (const chunk of chunks) {
      levelCounts[chunk.level] += 1;
      levelWordCounts[chunk.level].push(countWords(chunk.content));
      const chunkMetadata = chunk.metadata as DocumentChunkMetadata;
      const boundarySource = chunkMetadata.boundarySource ?? classifyChunkBoundarySource(section.content, chunk);
      boundarySourceCounts[boundarySource] = (boundarySourceCounts[boundarySource] ?? 0) + 1;

      if (typeof chunkMetadata.chunkId === "string") {
        metadataCoverage.chunkIds += 1;
      }

      if (chunk.level !== "document" && (chunkMetadata.previousChunkId || chunkMetadata.nextChunkId)) {
        metadataCoverage.adjacencyLinks += 1;
      }

      if (chunkMetadata.boundarySource) {
        metadataCoverage.boundarySources += 1;
      }

      if ((chunkMetadata.conceptKeywords?.length ?? 0) > 0) {
        metadataCoverage.conceptKeywords += 1;
      }
    }

    const keywordToChunks = new Map<string, {
      chunkIds: Set<string>;
      chunkLevels: Set<Chunk["level"]>;
      passageChunkIds: Set<string>;
    }>();
    for (const chunk of nonDocumentChunks) {
      const chunkMetadata = chunk.metadata as DocumentChunkMetadata;
      const chunkId = chunkMetadata.chunkId;

      if (!chunkId) {
        continue;
      }

      for (const keyword of chunkMetadata.conceptKeywords ?? []) {
        const entry = keywordToChunks.get(keyword) ?? {
          chunkIds: new Set<string>(),
          chunkLevels: new Set<Chunk["level"]>(),
          passageChunkIds: new Set<string>(),
        };

        entry.chunkIds.add(chunkId);
        entry.chunkLevels.add(chunk.level);
        if (chunk.level === "passage") {
          entry.passageChunkIds.add(chunkId);
        }
        keywordToChunks.set(keyword, entry);
      }
    }

    for (const [keyword, entry] of keywordToChunks.entries()) {
      if (entry.passageChunkIds.size < 2) {
        continue;
      }

      conceptSpanSamples.push({
        sourceId: `${section.documentSlug}/${section.sectionSlug}`,
        sectionTitle: section.title,
        keyword,
        chunkIds: [...entry.chunkIds],
        chunkLevels: [...entry.chunkLevels],
        passageChunkIds: [...entry.passageChunkIds],
      });
    }

    let overlappingPairs = 0;
    for (let index = 0; index < nonDocumentChunks.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < nonDocumentChunks.length; otherIndex += 1) {
        const left = nonDocumentChunks[index];
        const right = nonDocumentChunks[otherIndex];

        if (!hasOverlap(left, right)) {
          continue;
        }

        overlappingPairs += 1;
        totalOverlapPairs += 1;
        const key = `${left.level}->${right.level}`;
        overlapBreakdown[key] = (overlapBreakdown[key] ?? 0) + 1;
      }
    }

    if (passageCount > 1 || overlappingPairs > 0) {
      spanningCandidates.push({
        sourceId: `${section.documentSlug}/${section.sectionSlug}`,
        sectionTitle: section.title,
        passageCount,
        overlappingPairs,
      });
    }
  }

  const chunkCensus = {
    generatedAt,
    corpusSourceType: corpusConfig.sourceType,
    documentCount: documents.length,
    sectionCount: sections.length,
    totalChunks,
    totalOverlapPairs,
    levelCounts,
    averageWordsByLevel: {
      document: average(levelWordCounts.document),
      section: average(levelWordCounts.section),
      passage: average(levelWordCounts.passage),
    },
    chunkMetadataCoverage: metadataCoverage,
    minWordsByLevel: {
      document: Math.min(...levelWordCounts.document),
      section: Math.min(...levelWordCounts.section),
      passage: Math.min(...levelWordCounts.passage),
    },
    maxWordsByLevel: {
      document: Math.max(...levelWordCounts.document),
      section: Math.max(...levelWordCounts.section),
      passage: Math.max(...levelWordCounts.passage),
    },
    boundarySourceCounts,
    overlapBreakdown,
    conceptSpanAudit: {
      sectionsWithSplitConcepts: new Set(conceptSpanSamples.map((sample) => sample.sourceId)).size,
      spanningConceptCount: conceptSpanSamples.length,
      samples: conceptSpanSamples
        .sort((left, right) => right.passageChunkIds.length - left.passageChunkIds.length || left.sourceId.localeCompare(right.sourceId))
        .slice(0, 20),
    },
    multiChunkConceptSamples: spanningCandidates
      .sort((left, right) => {
        if (right.passageCount !== left.passageCount) {
          return right.passageCount - left.passageCount;
        }

        return right.overlappingPairs - left.overlappingPairs;
      })
      .slice(0, 5),
  };

  const querySensitivityMatrix = [] as Array<{
    id: string;
    label: string;
    expectedCanonicalPath: string;
    expectedSectionTitle: string;
    benchmarkRuns: QueryBenchmarkRun[];
    queryCount: number;
    uniqueTopHitCount: number;
    uniqueTop3HitCount: number;
    top3HitRate: number;
    top1HitRate: number;
    wrongTop1Count: number;
    missQueries: string[];
    groundingStateBreakdown: Record<string, number>;
    retrievalQualityBreakdown: Record<string, number>;
    variance: "low" | "medium" | "high";
  }>;

  const coverageMap = [] as Array<{
    bookSlug: string;
    sectionSlug: string;
    sectionTitle: string;
    expectedCanonicalPath: string;
    queriesTested: number;
    top1HitRate: number;
    top3HitRate: number;
    benchmarkRuns: Array<{
      query: string;
      expectedHitRank: number | null;
      topHitCanonicalPath: string | null;
      top3CanonicalPaths: string[];
      groundingState: string;
      retrievalQuality: string;
    }>;
    recallQuality: "strong" | "partial" | "weak";
  }>;

  for (const benchmarkCase of BENCHMARK_CASES) {
    const section = await repository.getSection(benchmarkCase.bookSlug, benchmarkCase.sectionSlug);
    const expectedCanonicalPath = buildCanonicalPath(benchmarkCase.bookSlug, benchmarkCase.sectionSlug);
    const benchmarkRuns: QueryBenchmarkRun[] = [];

    for (const query of benchmarkCase.queries) {
      const snapshot = await runSearch(query, "ANONYMOUS");
      const hitIndex = snapshot.results.findIndex((result) => result.canonicalPath === expectedCanonicalPath);

      benchmarkRuns.push({
        query,
        backend: snapshot.backend,
        fallbackError: snapshot.fallbackError,
        groundingState: snapshot.groundingState,
        followUp: snapshot.followUp,
        retrievalQuality: snapshot.retrievalQuality,
        expectedHitRank: hitIndex >= 0 ? hitIndex + 1 : null,
        topHitCanonicalPath: snapshot.results[0]?.canonicalPath ?? null,
        top3CanonicalPaths: snapshot.results.slice(0, 3).map((result) => result.canonicalPath).filter((path): path is string => Boolean(path)),
        results: snapshot.results,
      });
    }

    const top1Hits = benchmarkRuns.filter((run) => run.expectedHitRank === 1).length;
    const top3Hits = benchmarkRuns.filter((run) => run.expectedHitRank !== null).length;
    const uniqueTopHits = new Set(benchmarkRuns.map((run) => run.topHitCanonicalPath).filter(Boolean));
    const uniqueTop3Hits = new Set(benchmarkRuns.flatMap((run) => run.top3CanonicalPaths));
    const top1HitRate = Number((top1Hits / benchmarkRuns.length).toFixed(2));
    const top3HitRate = Number((top3Hits / benchmarkRuns.length).toFixed(2));
    const missQueries = benchmarkRuns
      .filter((run) => run.expectedHitRank === null)
      .map((run) => run.query);

    querySensitivityMatrix.push({
      id: benchmarkCase.id,
      label: benchmarkCase.label,
      expectedCanonicalPath,
      expectedSectionTitle: section.title,
      benchmarkRuns,
      queryCount: benchmarkRuns.length,
      uniqueTopHitCount: uniqueTopHits.size,
      uniqueTop3HitCount: uniqueTop3Hits.size,
      top3HitRate,
      top1HitRate,
      wrongTop1Count: benchmarkRuns.filter((run) => run.expectedHitRank !== 1 && run.topHitCanonicalPath !== null).length,
      missQueries,
      groundingStateBreakdown: summarizeCounts(benchmarkRuns.map((run) => run.groundingState)),
      retrievalQualityBreakdown: summarizeCounts(benchmarkRuns.map((run) => run.retrievalQuality)),
      variance: uniqueTopHits.size <= 1 ? "low" : uniqueTopHits.size === benchmarkRuns.length ? "high" : "medium",
    });

    coverageMap.push({
      bookSlug: benchmarkCase.bookSlug,
      sectionSlug: benchmarkCase.sectionSlug,
      sectionTitle: section.title,
      expectedCanonicalPath,
      queriesTested: benchmarkRuns.length,
      top1HitRate,
      top3HitRate,
      benchmarkRuns: benchmarkRuns.map((run) => ({
        query: run.query,
        expectedHitRank: run.expectedHitRank,
        topHitCanonicalPath: run.topHitCanonicalPath,
        top3CanonicalPaths: run.top3CanonicalPaths,
        groundingState: run.groundingState,
        retrievalQuality: run.retrievalQuality,
      })),
      recallQuality: top3HitRate >= 0.67 ? "strong" : top3HitRate > 0 ? "partial" : "weak",
    });
  }

  const retrievalPayloadSnapshots = {
    generatedAt,
    authenticatedStrong: await runSearch("printing press analogy", "AUTHENTICATED"),
    anonymousStrong: await runSearch("printing press analogy", "ANONYMOUS"),
    noResults: await runSearch("zzzxqv non existent corpus sentinel", "AUTHENTICATED"),
    getSection: (() => {
      return getSectionCommand.execute(
        {
          document_slug: "second-renaissance",
          section_slug: "ch01-why-now",
        },
        { role: "AUTHENTICATED", userId: "baseline-audit" },
      );
    })(),
  };

  const getSectionOutput = await retrievalPayloadSnapshots.getSection;

  await writeJsonArtifact("chunk-census.json", chunkCensus);
  await writeJsonArtifact("query-sensitivity-matrix.json", {
    generatedAt,
    cases: querySensitivityMatrix,
  });
  await writeJsonArtifact("coverage-map.json", {
    generatedAt,
    sampleSize: coverageMap.length,
    chapters: coverageMap,
  });
  await writeJsonArtifact("retrieval-payload-snapshots.json", {
    generatedAt,
    authenticatedStrong: retrievalPayloadSnapshots.authenticatedStrong,
    anonymousStrong: retrievalPayloadSnapshots.anonymousStrong,
    noResults: retrievalPayloadSnapshots.noResults,
    getSection: {
      document_slug: "second-renaissance",
      section_slug: "ch01-why-now",
      outputType: typeof getSectionOutput,
      found: typeof getSectionOutput === "object" && getSectionOutput !== null && (getSectionOutput as { found?: unknown }).found === true,
      canonicalPath:
        typeof getSectionOutput === "object" && getSectionOutput !== null && typeof (getSectionOutput as { canonicalPath?: unknown }).canonicalPath === "string"
          ? (getSectionOutput as { canonicalPath: string }).canonicalPath
          : null,
      resolverPath:
        typeof getSectionOutput === "object" && getSectionOutput !== null && typeof (getSectionOutput as { resolverPath?: unknown }).resolverPath === "string"
          ? (getSectionOutput as { resolverPath: string }).resolverPath
          : null,
      outputLength:
        typeof getSectionOutput === "object" && getSectionOutput !== null && typeof (getSectionOutput as { content?: unknown }).content === "string"
          ? (getSectionOutput as { content: string }).content.length
          : 0,
      includesTruncationMarker:
        typeof getSectionOutput === "object" && getSectionOutput !== null && (getSectionOutput as { contentTruncated?: unknown }).contentTruncated === true,
      relatedSectionCount:
        typeof getSectionOutput === "object" && getSectionOutput !== null && Array.isArray((getSectionOutput as { relatedSections?: unknown }).relatedSections)
          ? (getSectionOutput as { relatedSections: unknown[] }).relatedSections.length
          : 0,
      navigation:
        typeof getSectionOutput === "object" && getSectionOutput !== null
          ? {
            previousCanonicalPath:
              typeof ((getSectionOutput as { navigation?: { previous?: { canonicalPath?: unknown } | null } }).navigation?.previous?.canonicalPath) === "string"
                ? (getSectionOutput as { navigation: { previous: { canonicalPath: string } | null } }).navigation.previous?.canonicalPath ?? null
                : null,
            nextCanonicalPath:
              typeof ((getSectionOutput as { navigation?: { next?: { canonicalPath?: unknown } | null } }).navigation?.next?.canonicalPath) === "string"
                ? (getSectionOutput as { navigation: { next: { canonicalPath: string } | null } }).navigation.next?.canonicalPath ?? null
                : null,
          }
          : null,
      outputPreview:
        typeof getSectionOutput === "object" && getSectionOutput !== null && typeof (getSectionOutput as { content?: unknown }).content === "string"
          ? preview((getSectionOutput as { content: string }).content, 500)
          : null,
    },
  });

  process.stdout.write(
    [
      `Session value baseline artifacts written to ${path.relative(process.cwd(), OUTPUT_DIR)}`,
      `- documents: ${documents.length}`,
      `- sections: ${sections.length}`,
      `- chunks: ${totalChunks}`,
      `- query sensitivity cases: ${querySensitivityMatrix.length}`,
      `- coverage samples: ${coverageMap.length}`,
    ].join("\n") + "\n",
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});