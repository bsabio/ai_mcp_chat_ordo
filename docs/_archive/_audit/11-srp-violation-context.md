# Audit Report: SRP Violation inside Global Chat Context

**Severity:** Medium (Maintainability & Performance)
**Author:** Uncle Bob Martin
**Area:** React Architecture

## 1. Description
Your `useGlobalChat.tsx` file is a monolith. It handles message state, referral tracking, jobs events, push notifications, and API dispatching all in a single Context Provider. 

"Gather together the things that change for the same reasons. Separate those things that change for different reasons."

## 2. Impact
* Because this massive Context is situated at the top of the chat DOM, a background job update or a referral ping triggers a complete re-render of the entire chat message list.
* The mental model for extending chat behavior requires understanding 200+ lines of intertwined hooks.

## 3. Remediation Strategy
Split the `ChatContext` into isolated contexts:
1. `ChatDispatchContext` (stable functions, never re-renders)
2. `ChatStateContext` (messages array)
3. `ChatBackgroundEventsContext` (jobs/referrals).
Decouple your UI to achieve true React component independence.
