# Compatibility Layer Sunset Schedule

## Completed Removals

| Symbol | File | Sunset Date | Status |
|--------|------|-------------|--------|
| `getToolRegistry()` | `src/lib/chat/tool-composition-root.ts` | 2025-Q3 | **Removed** |
| `getToolExecutor()` | `src/lib/chat/tool-composition-root.ts` | 2025-Q3 | **Removed** |
| `getToolRegistry` re-export | `src/lib/chat/tools.ts` | 2025-Q3 | **Removed** |
| `getToolExecutor` re-export | `src/lib/chat/tools.ts` | 2025-Q3 | **Removed** |
| `createToolResults()` | `src/lib/chat/tools.ts` | 2025-Q3 | **Removed** |

## Migration Summary

All five deprecated symbols had zero non-test consumers. Tests were migrated to use `getToolComposition()` from `tool-composition-root`:

- `getToolRegistry()` → `getToolComposition().registry`
- `getToolExecutor()` → `getToolComposition().executor`
- `createToolResults()` → direct `executor()` calls

Test files updated:
- `tests/tool-manifest-contract.test.ts`
- `tests/system-prompt-assembly.test.ts`
- `tests/core-policy.test.ts`
- `tests/td-c-martin-solid-audit.test.ts`
- `tests/chat-tools.test.ts`
- `tests/chat-stream-route.test.ts` (mock cleanup)
- `tests/chat-job-actions-route.test.ts` (mock cleanup)
- `tests/deferred-job-notifications.test.ts` (mock cleanup)
- `src/lib/corpus-vocabulary.test.ts`

## Remaining Convenience Re-exports (NOT compatibility layers)

| File | Exports | Purpose |
|------|---------|---------|
| `src/lib/calculator.ts` | `calculate`, `isCalculatorOperation`, types | Stable import path for core entity |
| `src/core/search/types.ts` | Port types | Single-point import aggregation |
| `src/lib/chat/tool-composition-root.ts` | `getEmbeddingPipelineFactory`, `getBookPipeline`, `getCorpusPipeline`, `getSearchHandler` | Re-exports consumed by `embed-conversation.ts` |

These are not deprecated — they provide stable module boundaries, not backward compatibility.
