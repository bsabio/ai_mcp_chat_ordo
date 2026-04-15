# Audit Report: Inexcusable Database Locking (SQLite WAL)

**Severity:** High (Performance & Resilience)
**Author:** Donald Knuth & Uncle Bob Martin
**Area:** Database Configuration

## 1. Description
"Premature optimization is the root of all evil," but ignoring proper database semantics is just poor engineering. By default, SQLite operates in a rollback journal mode. In a high-throughput webhook/streaming environment like your `api/chat/stream` endpoints, concurrent reads and writes will inevitably trigger `SQLITE_BUSY` exceptions. 

If you are not explicitly enabling WAL (Write-Ahead Logging) mode and configuring a busy timeout on your `better-sqlite3` instance, your system is fragile. 

## 2. Impact
* A single slow string-append operation or batch job insert will lock the database, blocking all incoming chat requests.
* Threads will crash rather than queue. A violation of the robustness principle.

## 3. Remediation Strategy
Clean up your initialization code. "A system should be designed to handle failure, not mask it." Explicitly execute `PRAGMA journal_mode = WAL;` and `PRAGMA busy_timeout = 5000;` at the absolute entry point of `src/lib/db/index.ts`.
