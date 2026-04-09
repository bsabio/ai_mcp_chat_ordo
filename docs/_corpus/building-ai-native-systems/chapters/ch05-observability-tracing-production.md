# Observability, Tracing, and Production Engineering

## The Production Discipline Gap

Many AI engineering demonstrations work fine in a controlled demo environment and fail or degrade in ways that are difficult to detect in production. The specific gap: production systems receive unpredictable inputs, operate under varying load, exhibit performance characteristics that differ from development, and encounter failure modes that never appeared in testing.

Observability is the practice of making production system behavior visible, inspectable, and analyzable after the fact. For LLM systems, this is not optional infrastructure — it is the mechanism by which you know whether your system is actually working and can diagnose it when it is not.

## The Three Pillars of Observability

**Logs** are the event record. Every significant event in the system should be logged: incoming requests, outgoing LLM calls, tool invocations, retrieval operations, errors, latency, and token counts. Logs are the primary diagnostic tool when something goes wrong.

For LLM systems, the most critical log events are:
- The full prompt sent to the model (not just the user message — the complete context including system prompt and retrieved passages)
- The model's response
- Token counts and latency for each call
- Tool calls made and their results
- Error conditions and how they were handled

**Metrics** are the aggregate view. Where logs record individual events, metrics summarize behavior over time: average latency, error rate, token consumption per request, retrieval recall rate, cost per session. Metrics drive alerts (notify when error rate exceeds threshold) and trend analysis (is quality degrading over time?).

**Traces** are the distributed call graph. For multi-step agentic workflows, a trace shows the complete execution path of a single request: which tools were called, in what order, with what inputs and outputs, and at what latency. Tracing is essential for debugging agentic systems where the failure may be three tool calls deep.

## LLM-Specific Observability Concerns

**Prompt versioning.** When you change a prompt, you need to be able to trace subsequent behavior changes back to the prompt change. This requires versioning your prompts as you would version code, and tagging production logs with the prompt version that produced them.

**Semantic drift detection.** LLM responses can degrade in quality over time without any change to your system — due to model updates by the provider, distribution shift in incoming queries, or changes in the underlying data. Periodic automated evaluation runs (running your golden test set against production) can detect this drift before it becomes a user-visible quality problem.

**Cost attribution.** LLM API calls cost money proportional to token consumption. Production systems need per-user, per-session, and per-feature cost attribution to identify unexpected cost growth before it becomes a business problem.

**Privacy and audit logging.** For enterprise deployments, every LLM interaction involving potentially sensitive data needs to be logged with sufficient metadata to satisfy audit requirements. Who issued the query, when, against what data, and what was returned. This is a compliance requirement in regulated industries and an institutional requirement in organizations with data governance policies.

## The Operational Lifecycle

**Deployment:** LLM applications require staged rollouts — not big-bang production deploys. A new model version, prompt change, or retrieval system update should be deployed to a small percentage of traffic first, with metrics being monitored, before full rollout.

**Monitoring and alerting:** Define the specific metrics that indicate normal operation (latency range, error rate ceiling, cost per request) and set alerts that fire when they are exceeded. The alert should be specific enough that the on-call engineer knows what to investigate.

**Incident response:** When something goes wrong in production, the observability infrastructure determines how quickly you can diagnose and fix it. Define the incident response playbook before you deploy, not after the first production incident.

**Continuous evaluation:** Run the evaluation harness against production behavior on a scheduled basis. When metrics degrade, investigate before users report problems.

## Engineering for Graceful Degradation

LLM systems should fail gracefully, not catastrophically.

When the LLM returns an unexpected format — fall back to a structured response rather than crashing. When the retrieval system returns no results — tell the user clearly rather than generating a hallucinated answer. When an agentic step fails — provide a partial result and a clear error, rather than silently producing nothing.

Design the failure modes before any of them happen. The system that degrades gracefully retains user trust during the inevitable moments when something goes wrong. The system that crashes or silently fails does not.
