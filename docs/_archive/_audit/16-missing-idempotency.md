# Audit Report: Idempotency Failures in Streaming APIs

**Severity:** High (Reliability)
**Author:** Donald Knuth
**Area:** Client/Server Synchronization

## 1. Description
"An algorithm must be unambiguous." When a client triggers `sendMessage()`, the frontend optimistically inserts a message, while the backend generates it. If the connection fails mid-stream but the backend completes its generation and commits to SQLite, your client has no knowledge of this commit. 

When the user retries, they send a duplicate message, triggering a secondary overlapping generation.

## 2. Impact
* The database incurs duplicate entries that corrupt the context window. 
* The user's screen desynchronizes from reality.

## 3. Remediation Strategy
Establish strict Idempotency Keys on the HTTP header. The client must generate a UUID for the specific chat turn, and transmit it. If the backend detects the key, it retrieves the previously completed generation from the `Transcript Store` rather than initiating another costly LLM chain. "Ensure state modifications are invariant to identical consecutive requests."
