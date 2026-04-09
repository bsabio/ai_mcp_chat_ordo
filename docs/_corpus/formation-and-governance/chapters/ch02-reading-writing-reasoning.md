# Reading, Writing, and Reasoning as Technical Skills

## The Category Error

The most damaging assumption in technical education is that reading, writing, and reasoning are "soft" or "foundational" skills to be acquired separately, before the technical work begins.

This is a category error. Reading, writing, and reasoning are technical skills in precisely the same sense that debugging, system design, and version control are technical skills: they are learnable, practisable, assessable, and directly load-bearing on the quality of professional output.

A software engineer who cannot write clear documentation produces a system that cannot be maintained by anyone else. A data scientist who cannot reason about the limits of their methodology produces findings that may be wrong in ways they cannot detect. An AI engineer who cannot read a technical paper carefully will build systems based on misunderstood research without knowing it.

These are not soft skills. They are load-bearing technical capabilities.

## Reading as a Technical Practice

Technical reading is different from general reading. It requires specific habits:

**Identifying the claim.** Before evaluating a paper, specification, or technical document, identify what it is actually claiming. What is the thesis? What would have to be false for this document to be wrong? Many practitioners never develop this habit and accept or reject technical work based on surface impressions.

**Understanding the evidence.** Not just "there is a study" or "the authors say." What was the methodology? How was it measured? What are the confidence intervals or uncertainty estimates? What alternative explanations could produce the same findings?

**Recognizing the assumptions.** Every technical argument rests on assumptions that are not explicitly stated. Reading at the level of identifying those assumptions — and asking whether they hold in your specific context — is an advanced technical skill.

**Building structured summaries.** Not highlighting and hoping. Writing a brief structured summary of what was claimed, what evidence was provided, and what you are uncertain about. This is both a comprehension test and a memory aid.

**Practical training:** Take three technical papers from the AI engineering field that are directly relevant to your current work. For each, produce a one-page structured summary: main claim, evidence provided, assumptions made, limitations noted, and one specific implication for your work.

## Writing as a Technical Practice

Professional writing in technical fields has different standards from academic writing and informal writing.

**Precision.** Technical writing says what it means, no more and no less. Vagueness is not a style choice — it is a technical failure when precision is required.

**Audience-specificity.** A technical specification written for engineering colleagues is different from an executive summary written for a head of product, which is different from a status update written for a team standup. The capacity to write the same core information accurately for multiple audiences is a core professional skill.

**Structured argument.** Technical writing that persuades does so through organized evidence and reasoning, not through rhetorical force or assertiveness. The claim is stated. The evidence is provided. The limitations are acknowledged. The conclusion follows from the evidence.

**Revision.** First drafts are not technical writing — they are raw material for technical writing. The professional who treats the first draft as the final product produces systematically lower quality output than the one who revises.

**Practical training:** Select one technical decision you made recently. Write a 500-word memo documenting: what the decision was, what options you considered, what evidence informed each option, and why you chose what you did. This exercise builds the habit of documented decision-making that is essential for professional credibility and team transparency.

## Reasoning Under Uncertainty

The definition of reasoning for professional purposes: the capacity to make a defensible decision when information is incomplete, arrive at a clear recommendation, explain the logic of that recommendation in a way that allows others to identify flaws, and update that recommendation when better evidence arrives.

This is not natural ability. It is a practised skill.

The specific practices that develop it:

**Pre-mortems.** Before starting a project or making a decision, ask: "Assume this fails. What was the most likely reason?" This forces explicit acknowledgment of assumptions and failure modes before they are tested by reality.

**Explicit probability estimation.** For important uncertain judgments, assign explicit probability estimates. Not just "this might work" but "I estimate 65% probability this approach meets the performance requirements, 25% probability it underperforms by 20% or more, and 10% probability of a fundamental architecture issue requiring redesign." Explicit estimation is revisable; vague intuition is not.

**Decision logging.** Record significant decisions, the information available at the time, and the reasoning used. Review past decisions against outcomes six months later. This practice — more than any other single habit — accelerates the development of judgment.
