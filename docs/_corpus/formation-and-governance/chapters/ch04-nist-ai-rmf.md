# NIST AI RMF: The Governance Stack

## Why Governance Is a Technical Skill

AI governance is often taught as a policy or ethics topic — a discussion of principles and frameworks that exist to constrain what AI can do. This is the wrong framing for a technical program.

Governance is a technical skill for practitioners because the people who build AI systems are the people who implement governance. The compliance team does not write the prompts, design the evaluation harnesses, or decide what data the RAG pipeline retrieves. The engineers do. If those engineers do not understand governance frameworks, the systems they build will not meet the requirements those frameworks impose.

More practically: enterprise clients, regulated industries, and government organizations increasingly require AI governance documentation as a condition of deployment. An AI engineer who cannot produce a governance-compliant system specification, a risk assessment, or an audit trail cannot be deployed in these contexts — regardless of their technical skill.

## The NIST AI Risk Management Framework

The National Institute of Standards and Technology AI Risk Management Framework (NIST AI RMF) is the primary US government reference for responsible AI deployment. It has wide adoption in enterprise contexts and is increasingly referenced in procurement requirements.

The RMF organizes AI risk management into four core functions, applied iteratively:

**GOVERN:** The organizational policies, roles, and responsibilities that shape how AI systems are developed, deployed, and maintained. This includes: who is accountable for AI system decisions, what the organizational risk tolerance is, how incidents are reported and addressed.

**MAP:** The process of identifying and categorizing the context, potential risks, and potential benefits of a specific AI system. Key questions: who are the stakeholders and affected parties? What are the intended uses? What are the foreseeable misuses? What are the known failure modes?

**MEASURE:** The processes for quantifying and monitoring identified risks. This includes: what metrics are tracked, what thresholds trigger intervention, how ongoing monitoring is structured, and how performance against risk criteria is documented.

**RESPOND:** The processes for addressing identified issues, including: defined escalation paths, incident response procedures, communication protocols for affected parties, and mechanisms for updating the system based on real-world performance.

## The Six Key Risk Dimensions

The NIST RMF organizes AI risk management around six core properties an AI system should have:

**Accountable:** There are clearly defined human roles responsible for the AI system's behavior and outcomes. Anonymous or committee-diffused AI systems with no clear human accountability are a governance failure.

**Explainable and Interpretable:** The system's reasoning can be made legible to appropriate stakeholders. Not all AI systems can be fully transparent — but all should have explanation mechanisms appropriate to their risk level and use case.

**Fair with Harmful Bias Managed:** The system is evaluated for discriminatory or differential impacts across populations, and those impacts are managed. This includes both the data the system trains on and the contexts where it is deployed.

**Privacy-Enhanced:** The system incorporates appropriate data minimization, consent, and access control mechanisms. Handling personal data without explicit privacy analysis is a governance failure regardless of technical capability.

**Safe:** The system avoids, with sufficient confidence, outcomes that are hazardous to users or the broader environment in which it operates.

**Secure and Resilient:** The system is designed to resist adversarial attack, recover from failure, and continue functioning appropriately under conditions of stress.

## Applying This to a Real Project

For any AI system you are building or evaluating, the NIST RMF produces a structured set of deliverables:

1. **A context document:** What is this system designed to do? Who are the intended users? What are the intended use cases? What are the foreseeable misuse cases?
2. **A risk register:** What specific risks have been identified? How severe is each, and how probable? What controls have been implemented to address each?
3. **An evaluation plan:** How will risk management controls be verified? What metrics will be tracked? At what thresholds will intervention be required?
4. **An incident response plan:** When something goes wrong, what happens? Who is notified? How is the system taken offline or constrained if necessary?

Producing these documents for a real system is not a documentation exercise — it reveals gaps in the system design that would otherwise remain invisible until they become production incidents.
