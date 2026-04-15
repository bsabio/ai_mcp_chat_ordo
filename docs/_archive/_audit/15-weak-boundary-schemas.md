# Audit Report: Boundary Contamination (Weak Schemas)

**Severity:** Medium (Resilience)
**Author:** Uncle Bob Martin
**Area:** API Data Contracts

## 1. Description
Your API routes depend heavily on implied types for JSON payloads (e.g., reading `req.json()` directly into an interface). 

"Clean code is not written by passing unknown parameters around." When you accept JSON from the client without rigorously validating every bit of it at the absolute edge of the system, you contaminate your pristine inner domains with dirty data.

## 2. Impact
* XSS vector payloads or arbitrarily large JSON objects will penetrate your business layers, crashing downstream services.
* Database inserts will fail with opaque constraints rather than clear edge-validation warnings.

## 3. Remediation Strategy
Adopt `Zod` or similar runtime parsing schemas. Every POST endpoint must begin with a `payloadSchema.parse()` instruction before any logic executes. If it fails, standard 400 Bad Request exception immediately. Protect your domain interfaces.
