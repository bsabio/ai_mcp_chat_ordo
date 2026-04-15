# Audit Report: Unbounded Context Window Growth

**Severity:** High (Performance & Cost)
**Author:** Donald Knuth
**Area:** Agent Runtime Pipeline

## 1. Description
In computational complexity, space bounds are just as important as time bounds. Your chat `orchestrator.ts` continues to append messages to the context array indefinitely. While there are drafts for `07-context-window-guard`, they are not rigidly enforced in the fundamental stream loop.

## 2. Impact
* Tokens increase monotonically. API response latencies degrade geometrically with polynomial scaling characteristics depending on the LLM's attention mechanism.
* User sessions will violently crash with `context_length_exceeded` errors without a graceful degradation path.

## 3. Remediation Strategy
Adopt a sliding-window algorithm combined with an LRU (Least Recently Used) summarization pass. Before the token count breaches 80% of the maximum window size, asynchronously invoke a summary model to compress the `$N$` oldest messages into a dense semantic state block.
