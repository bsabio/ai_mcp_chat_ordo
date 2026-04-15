# Audit Report: Dead Code & Orphan Identification

This report details potential dead code, orphan files, and "zombie" dependencies identified during the OrdoSite architectural audit.

---

## 1. Boundary & Layer Violations

The following files exhibit boundary violations where the **Core Domain** depends on **Adapter Implementations**. This creates "zombie" dependencies that make the core logic difficult to test or port without infrastructure.

| File | Violation | Impact |
| --- | --- | --- |
| `src/core/use-cases/UserAdminInteractor.ts` | Imports `UserDataMapper` (Adapter) directly. | High. Prevents swapping the data source without modifying business logic. |
| `src/lib/chat/stream-pipeline.ts` | Deeply coupled with `RepositoryFactory` (Adapter) for job handling. | Medium. Makes the stream orchestrator difficult to unit test in isolation. |

---

## 2. Potential Orphan Files (Research Required)

The following files are candidates for removal after manual verification. They appear to have zero incoming dependencies from non-test code.

### 2.1 Legacy Hooks
The decomposition of the chat runtime has left behind several hooks that may no longer be consumed by the new `useGlobalChat` orchestrator:
- `src/hooks/usePresentedChatMessages.ts` (Likely superseded by `chatState.ts`)
- `src/hooks/useMockAuth.ts` (Likely superseded by real auth in `src/lib/auth.ts`)
- `src/hooks/useViewTransitionReady.ts` (Check if used in any layout/page)

### 2.2 Incidental Utilities
- `src/lib/calculator.ts`: Verify if this is redundant with the `mcp/calculator-tool.ts` implementation.
- `src/lib/chat/migrate-anonymous-conversations.ts`: If the migration is a one-time script, this should be moved to `/scripts` or deleted.

---

## 3. Dependency Audit (package.json)

| Package | Status | Recommendation |
| --- | --- | --- |
| `adm-zip` | Used in `mcp/librarian-tool.ts` | Keep. |
| `bcryptjs` | Used in `adapters/UserDataMapper.ts` | Keep. |
| `stylelint` | No config found in root | **Verify**. If not used, remove devDependency. |
| `@lhci/cli` | Used in `scripts/` | Keep for performance monitoring. |

---

## 4. Approach for Cleanup

1. **Verify**: Before deleting any file, run `grep -r "[basename]" src/` to ensure no hidden imports.
2. **Deprecation Path**: For large modules, mark with `@deprecated` comments before full removal.
3. **Guardrail Check**: Ensure `npm run test` and `npm run build` pass after every deletion.
