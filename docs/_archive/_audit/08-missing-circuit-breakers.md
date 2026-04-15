# Audit Report: Missing Circuit Breakers for Anthropic SDK

**Severity:** High (Reliability)
**Author:** Uncle Bob Martin
**Area:** API Boundaries

## 1. Description
Look at your boundaries. Your `src/lib/chat/anthropic-client.ts` interacts directly with the Anthropic API. But what happens when Anthropic degrades? Your application blindly hammers the API, waiting for timeouts, stalling the UI, and backing up your Node event loop.

"The architecture of the system should shout its intent." Right now, it shouts, "I assume the network is flawless."

## 2. Impact
* When the LLM provider latency spikes, your system threads saturate, leading to cascading failures across uncorrelated endpoints (like `/api/jobs`).
* Zero fault tolerance.

## 3. Remediation Strategy
Follow the Dependency Inversion Principle. Wrap the Anthropic client in a Circuit Breaker object. If failure rates across a 10-second window exceed 20%, open the circuit, fail fast on the frontend with a degraded-service UX, and slowly bleed traffic back in half-open state.
