# Sprint 2 - Attachment Lifecycle Reaper

> **Goal:** Add server-owned cleanup for stale unattached chat uploads and expose an operator entry point.
> **Spec ref:** `CRH-022`, `CRH-033`, `CRH-034`, `CRH-035`, `CRH-036`, `CRH-041`, `CRH-042`

## Tasks

1. Extend the user-file repository/file-system path with stale unattached file discovery and reaping.
2. Add a chat-upload-specific reaper helper that targets unattached `document` files older than the configured TTL.
3. Run the reaper opportunistically from `POST /api/chat/uploads` without failing the request if cleanup itself errors.
4. Add an operator-facing script entry point via `npm run admin:reap-chat-uploads`.

## Completion Checklist

- [x] Stale unattached file query added
- [x] File-system reaper added
- [x] Upload route runs best-effort stale cleanup
- [x] Admin reaper script added

## QA Deviations

None.

## Verification

- `npm exec vitest run src/adapters/UserFileDataMapper.test.ts src/lib/user-files.test.ts src/app/api/chat/uploads/route.test.ts`
