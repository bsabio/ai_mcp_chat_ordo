# Audit Report: Serverless Rehydration Database Tax

**Severity:** Medium (Reliability)
**Author:** Donald Knuth & Uncle Bob Martin
**Area:** Full Stack Deployment

## 1. Description
You are using `better-sqlite3` combined with Next.js API Routes. If this application is ever deployed to a serverless edge environment (like Vercel), each cold start spins up a new isolated node execution context, attempting to acquire file-locks on a detached SQLite instance.

"Software architecture comprises the most significant design decisions."

## 2. Impact
* In serverless, local SQLite databases evaporate between invocations unless bound to a specific mounted volume.
* If bound to a volume, the file access latency in highly distributed serverless environments destroys the C-level performance benefits of `better-sqlite3`.

## 3. Remediation Strategy
Abstract your persistence layer. If you intend to remain serverless, you must utilize a distributed connection pool (e.g., libSQL/Turso). If you intend to remain on SQLite locally, you must enforce a monolithic, containerized deployment (e.g., Docker/VPS) where a single Node process owns the SQLite file lock natively.
