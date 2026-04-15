# Audit Report: Hanging SSE Streams and Memory Leaks

**Severity:** High (Performance & Resilience)
**Author:** Donald Knuth
**Area:** API Server-Sent Events

## 1. Description
An elegant algorithm terminates. Your `/api/chat/stream` endpoints utilize Server-Sent Events (SSE). However, if the client silently drops the TCP connection (e.g., cell network drop), the Node.js request does not immediately tear down if the underlying `Anthropic` SDK stream doesn't detect the broken pipe in time. 

You are lacking strict `req.signal` (AbortController) propagation down to the core LLM execution loop.

## 2. Impact
* Memory complexity grows linearly with the number of dropped connections. 
* Ghost streams continue consuming API tokens, draining the financial resources of the project with O(N) decay.

## 3. Remediation Strategy
Bind the Next.js `req.signal` directly to the Anthropic client request options. When the client disconnects, the AbortSignal fires, and the underlying socket to the LLM destroys itself immediately. "Do not compute what you do not need to compute."
