# Agentic Systems and Tool Use

## What an Agent Is

An agent is an LLM system that can take actions — not just generate text, but interact with external systems, retrieve information, execute code, or make multi-step decisions toward a goal.

The key architectural difference from a pure generation system: in a generation system, the flow is User → Prompt → LLM → Response. In an agent system, the flow is User → Goal → LLM → Action → Environment → Observation → LLM → Next Action → ... → Final Response.

The agent sees the results of its actions and uses them to shape subsequent decisions. This creates the possibility of meaningful multi-step task completion — and the possibility of meaningful multi-step failure.

## The Tool Use Pattern

The fundamental building block of agentic systems is tool use. The LLM is given a set of available tools (described in its system prompt or via an API-level tool specification), and it can decide to invoke those tools as part of producing a response.

**What a tool is:** A function with a defined schema — input parameters, types, and a description that helps the model understand when to use it and how. Common tool categories:

- **Search tools:** Web search, corpus search, database queries
- **Execute tools:** Code interpreters, shell commands, API calls
- **Read tools:** File reading, web scraping, structured data extraction
- **Write tools:** File writing, database updates, sending messages
- **UI tools:** Interface control, state management, display adjustments

**The tool schema:** Each tool should be described with enough precision that the model can decide whether to call it and how to construct the call. Vague tool descriptions produce unpredictable tool selection. Precise tool descriptions produce reliable, predictable behavior.

## Agentic Architecture Patterns

**ReAct (Reason + Act):** The model alternately reasons about the current state and situation, then acts by calling a tool or producing an output. The reasoning trace is visible. This is the most commonly used beginner pattern and provides good debuggability.

**Plan-and-Execute:** The model produces a plan (a sequence of steps to achieve the goal), then executes each step in sequence. More structured than ReAct for multi-step tasks, but brittle when the plan requires revision mid-execution.

**Multi-agent systems:** Multiple specialized agents, each with specific tools and responsibilities, coordinated by an orchestrator. More powerful for complex tasks but significantly more difficult to debug and evaluate.

**Human-in-the-Loop:** Agentic systems with human checkpoints at high-stakes decision points. Required for any production system where the cost of error is high.

## What Makes Agents Hard in Production

**Non-determinism compounds.** Each tool call introduces variance. In a 10-step agentic workflow, if each step has 90% reliability, the end-to-end reliability is approximately 35%. Planning for failure is not optional.

**Tool errors propagate.** When a tool call fails or returns unexpected output, the model's subsequent reasoning is based on incorrect information. Robust error handling at every tool call boundary is mandatory.

**Context window management becomes critical.** Multi-step workflows accumulate context — tool results, intermediate reasoning, conversation history. Context management strategy needs to be designed explicitly for agents, not just for single-turn responses.

**Evaluation is much harder.** Evaluating whether a single LLM response is good is hard. Evaluating whether a 15-step agentic workflow completed its goal correctly, efficiently, and without side effects is a research-grade problem. Production agents require dedicated evaluation infrastructure.

## The RBAC Constraint on Tools

In enterprise systems, not all tools should be available to all users.

Exposing an agentic system to an unauthenticated user with full tool access — including tools that write to databases, execute code, or access sensitive documents — is a security failure, not a product decision.

Ordo's architecture implements tool-level RBAC: each tool has a required role, and the agent's tool registry filters available tools based on the authenticated user's role. The agent cannot attempt to use a tool the user is not authorized for — the tool does not appear in the agent's context.

This is the correct enterprise architecture for agentic systems. It is not a restriction on the agent — it is a security constraint on the scope of action available in each role context.
