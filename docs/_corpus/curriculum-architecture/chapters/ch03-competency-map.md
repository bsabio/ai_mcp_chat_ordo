# The Competency Map: Spine Courses vs. Real Job Requirements

## Why This Map Exists

A competency map answers a question that program designers and students both need to be able to answer: **if someone hires from this program, what will they get?**

Not what the program intends to produce. What it demonstrably produces — documented in artifacts, mapped against what real employers at real organizations explicitly require in current job postings.

This chapter documents that mapping. The job posting data comes from six organizations: Palantir (Forward Deployed AI Engineer), Databricks (AI Engineer FDE), Anthropic (Forward Deployed Engineer Applied AI), Accenture (Forward Deployed Engineer), City of San Francisco (AI Product Engineer), and Tome (AI Product Engineer).

## The Market Competency Clusters

Six competency clusters appear with enough consistency across these six job descriptions to be treated as the target capability definition for this degree:

**1. RAG + Retrieval Pipelines**
Building, tuning, and evaluating retrieval-augmented generation systems. Databricks explicitly names RAG as a requirement; the SF city role focuses on trustworthy retrieval outputs; Tome emphasizes RAG pipeline quality.

**2. Agent Systems + Tool Use**
Designing and implementing multi-agent workflows, agentic architectures, and tool-using LLM systems. Anthropic explicitly requires sub-agents and agent skills as deliverables; Databricks names multi-agent systems.

**3. Evaluation Frameworks**
Building evaluation harnesses, running red-team scenarios, and producing quantitative evidence that a system meets its specifications. Anthropic requires evaluation frameworks as a core deliverable; Accenture emphasizes evaluation for robustness, safety, and fairness.

**4. Production Engineering**
Taking AI systems from prototype to production: CI/CD, observability, load testing, incident response, security. Palantir explicitly requires taking workflows to production; Accenture requires CI/CD, tracing, and logging.

**5. Product Framing + Iteration**
Problem scoping from user needs, rapid prototyping, stakeholder communication, adoption measurement. Tome emphasizes problem scoping and high-velocity experimentation; the SF role emphasizes iteration via pilots and user feedback.

**6. Responsible Deployment**
Governance, fairness evaluation, transparency design, privacy compliance, safety guardrails. The SF role explicitly requires trustworthy and transparent tools; Accenture emphasizes safety and fairness in evaluation.

## The Full Mapping Table

| Market Competency | Evidence in Postings | Spine Courses That Teach It | Mastery Artifact |
|---|---|---|---|
| RAG + retrieval pipelines | Databricks, SF, Tome | IS425 (primary), IS331 (data layer) | RAG service with eval report; retrieval quality metrics |
| Agent systems + tool use | Anthropic, Databricks | IS425 (primary), IS390 (requirements) | Agent workflow demo; tool-use reliability tests; safety constraints |
| Evaluation frameworks | Anthropic, Accenture | IS425 (primary), IS455 (LLMOps) | Evaluation harness; regression suite; red-team scenarios |
| Production engineering | Palantir, Accenture | IS218, IS455 (primary), capstone | CI/CD pipeline; load tests; observability traces; incident postmortem |
| Product framing + iteration | Tome, SF | IS390 (primary), IS265, IS455 | PRD + experiment plan; stakeholder demo; adoption metrics |
| Responsible deployment | SF, Accenture | IS425, IS455 (primary) | Risk register; governance checklist; transparency UX patterns |

## The Hybrid Professional Target

The market is converging on a specific profile — one that does not fit neatly into either "software engineer" or "data scientist" or "product manager." The job descriptions consistently require someone who can:

1. **Build** — LLM systems, RAG pipelines, agentic workflows, production software
2. **Evaluate** — with quantitative rigor, not just subjective impression
3. **Operate** — with observability, monitoring, and incident response capability
4. **Communicate** — across technical and non-technical audiences, with the skill to drive adoption, not just build the system

This is the profile this curriculum intentionally builds. Each capability cluster has a home in the spine. None are treated as elective or supplemental.

## What This Map Is Not

This map is not a guarantee that graduates will immediately qualify for any of these specific roles at these specific companies. Those roles require experience beyond what a degree can provide.

What the map guarantees is that the competency clusters these roles require have been explicitly addressed, assessed, and documented in student artifacts — so that when a student applies, they can point to specific evidence that they have worked in each cluster, not just been taught about it.

That distinction — between having worked in a capability area and having been taught about it — is the difference between a credential that produces conversions and one that produces polite rejections.
