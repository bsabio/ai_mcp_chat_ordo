# Conversation Retention And Lifecycle Matrix

> **Status:** Kickoff defaults for implementation
> **Applies to:** [Conversation Operations And Retention](../spec.md) Sprint 0

## Default Decisions

1. **Anonymous session TTL:** 30 days from last conversation activity.
2. **Anonymous recent-history cap:** the most recent 10 conversations within the active cookie lifetime.
3. **Signed-in archived retention:** retained indefinitely by default.
4. **Signed-in trash restore window:** 30 days from soft-delete.
5. **Ordinary admin purge:** only after the restore window has elapsed.
6. **Privacy/compliance deletion:** hide immediately from user surfaces, queue purge within 30 days, and retain only a minimal audit record of the request and purge outcome.
7. **Deactivated accounts:** preserve conversations for admin review and possible reassignment; do not cascade-delete on deactivation.

## Lifecycle Matrix

| Case | User-visible state | Admin-visible state | Searchable | Restore path | Retention / purge default | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Anonymous active conversation | Visible in the current chat shell | Visible only if later migrated or inspected through admin tooling after migration | No user search surface | Not applicable | 30 days from last activity | Same-browser continuity only |
| Anonymous archived conversation | Recoverable from bounded recent-history list if cookie still exists | Visible after migration; otherwise treated as anonymous session data | No | Yes, within same cookie lifetime | 30 days from last activity | Cap recent history at 10 conversations |
| Signed-in active conversation | Visible as the current live thread | Visible in admin browse/detail | Not in archived-history search | Not applicable | Indefinite until user action or policy event | Single active thread model remains intact |
| Signed-in archived conversation | Visible in history | Visible in admin browse/detail | Yes | Yes, restore to active or reopen as archived detail | Indefinite by default | Archive is the normal non-destructive history state |
| Signed-in soft-deleted conversation | Hidden from default history; visible in trash scope only | Visible in admin browse/detail and deleted filters | No on ordinary user surfaces | Yes, for 30 days | Purge eligible after 30 days | Default behavior for self-service delete |
| Deactivated-user conversation | Not visible to the deactivated user | Fully visible to admins | Yes for admins | Admin reassignment or restore only | Indefinite until policy review | Deactivation is an access change, not a data-destruction event |
| Privacy/compliance-requested conversation | Hidden immediately | Restricted admin/compliance view only until purge | No | No self-service restore | Purge within 30 days | Keep only minimal audit record after purge |
| Purged conversation | Not visible | Only audit metadata remains | No | None | Terminal state | Ordinary product flows should rarely reach this state |

## Management Actions By Role

| Role | Allowed conversation-management actions |
| --- | --- |
| `ANONYMOUS` | New chat, archive current chat, restore recent same-browser history, copy message/transcript, stop generation, retry failed send |
| `AUTHENTICATED` | Rename, archive, restore, move to trash, restore from trash, copy transcript, export, import exact platform export, stop generation |
| `APPRENTICE` | Same as authenticated self-service scope |
| `STAFF` | Same as authenticated self-service scope unless another feature explicitly delegates more |
| `ADMIN` | Global inspect/search, archive, restore, export, takeover/hand-back, governed purge, reassignment support |

## Compatibility Decisions

1. `DELETE /api/conversations/[id]` changes semantic meaning from hard-delete to soft-delete for ordinary self-service callers.
2. Purge remains a separate admin/system workflow and is never the default meaning of ordinary delete.
3. Import accepts exact platform export JSON by file upload or exact JSON paste; freeform prose paste remains ordinary chat input.
4. Stop generation affects only the active model stream; it does not cancel deferred jobs.
