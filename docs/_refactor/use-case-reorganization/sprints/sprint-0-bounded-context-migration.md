# Sprint 0 — Bounded Context Directory Migration

> **Goal:** Move all 65 files in `src/core/use-cases/` into 8 bounded-context
> subdirectories, update all imports across the codebase, and verify build
> and tests pass.
>
> **Spec Sections:** 2 (Design Goals), 3 (Architecture)
>
> **Prerequisite:** None (can run independently of other refactors)

## Available Assets

| Asset | Location |
| --- | --- |
| Current flat directory | `src/core/use-cases/` (65 files) |
| Tools subdirectory | `src/core/use-cases/tools/` (49 files, unchanged) |
| Route handlers | `src/app/api/` |
| Adapters | `src/adapters/` |
| Existing tests | `tests/` and co-located `*.test.ts` files |
| TypeScript config | `tsconfig.json` (path aliases) |

---

### Task 1 — Create directories and move auth domain

Create `src/core/use-cases/auth/` and move:

- `AuthenticateUserInteractor.ts` + `.test.ts`
- `RegisterUserInteractor.ts` + `.test.ts`
- `ValidateSessionInteractor.ts` + `.test.ts`
- `PasswordHasher.ts`
- `SessionRepository.ts`
- `UserRepository.ts`

Use `git mv` to preserve history. Update all broken imports immediately.

**Verify:**

```bash
npx tsc --noEmit
```

---

### Task 2 — Move users, chat, and content domains

Create `src/core/use-cases/users/`, `chat/`, and `content/` directories.
Move files per spec section 3.1. Update imports.

**Verify:**

```bash
npx tsc --noEmit
```

---

### Task 3 — Move library, sales, llm, and common domains

Create `src/core/use-cases/library/`, `sales/`, `llm/`, and `common/`
directories. Move files per spec section 3.1. Update imports.

**Verify:**

```bash
npx tsc --noEmit
```

---

### Task 4 — Create barrel index files

Create `index.ts` in each new subdirectory re-exporting all public
interfaces and interactors. This allows consumers to import from the
directory path:

```typescript
import { AuthenticateUserInteractor } from "@/core/use-cases/auth";
```

**Verify:**

```bash
npx tsc --noEmit
```

---

### Task 5 — Full test suite verification

Run the complete test suite with no test changes beyond import paths.

**Verify:**

```bash
npx vitest run
npm run build
```

---

## Completion Checklist

- [ ] 8 bounded-context directories created under `src/core/use-cases/`
- [ ] All 65 files moved with `git mv`
- [ ] All import paths updated across route handlers, adapters, and tests
- [ ] Barrel `index.ts` in each subdirectory
- [ ] `npx tsc --noEmit` passes
- [ ] `npx vitest run` passes (no test failures from reorganization)
- [ ] `npm run build` succeeds
