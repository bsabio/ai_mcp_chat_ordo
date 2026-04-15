# Audit Report: Absolute Lack of Route Rate Limiting

**Severity:** High (Resilience)
**Author:** Uncle Bob Martin
**Area:** Global Infrastructure

## 1. Description
A robust system defends its core domains aggressively. Your Next.js App Router exposes `/api/chat/stream`, `/api/jobs`, and `/api/user-files` without a globally enforced sliding-window rate limit token bucket. 

You leave the door wide open. "If you don't control your system, someone else will."

## 2. Impact
* Malicious users, or simply buggy automated agents, can ping `/api/chat/stream` a thousand times a second, instantly depleting database IOPS and draining Anthropic Tier allocations.

## 3. Remediation Strategy
Implement a `RateLimit Middleware`. Define strict boundaries—no more than 10 streaming context requests per minute per IP or authenticated User ID. Return a `HTTP 429 Too Many Requests` rapidly.
