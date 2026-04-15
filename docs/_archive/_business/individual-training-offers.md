# Individual Training Offers

## Objective

Define a concrete, public-facing packaging model for the individual training lane so Studio Ordo can recommend clear next steps instead of treating every serious individual conversation as generic consulting.

---

## 1. Training Thesis

The individual lane is for high-skill people who want to work with AI agents seriously.

This is not a casual course business. The goal is to help developers, technical operators, and other ambitious practitioners learn how to:

1. Orchestrate AI agents intentionally
2. Evaluate outputs with discipline
3. Structure workflows instead of chasing one-off prompts
4. Work in a way that could support real client delivery or apprenticeship

---

## 2. Who This Is For

### Strong Fit

- Developers who want stronger AI orchestration skill
- Technical operators building internal systems
- Professionals moving from casual AI use to disciplined practice
- People who want mentorship grounded in real delivery standards

### Weak Fit

- Casual hobby learners
- People looking for low-cost mass-market tutorials
- Buyers who really need organizational consulting, not personal training
- People expecting apprenticeship access without skill, discipline, or accountability

---

## 3. Packaging Model

### 3.1 Free Fit Call

**Format:** up to 60 minutes

**Purpose:** determine whether the person belongs in training, mentorship, apprenticeship screening, or the organizational lane.

**Output:** a recommendation for the next best step.

**Price:** free

### 3.2 Half-Day AI Operator Intensive

**Format:** half day

**Purpose:** a concentrated working session for someone who needs a serious upgrade in how they prompt, orchestrate, and evaluate AI output.

**Best for:** practitioners with real work to improve now.

**Typical outcomes:**

- clearer prompting and orchestration patterns
- evaluation and review discipline
- a cleaner personal workflow for AI-assisted work
- a practical list of habits to adopt immediately

**Price:** `$1,100`

### 3.3 Full-Day AI Operator Lab

**Format:** full day

**Purpose:** a deeper training session for people who need a complete working model rather than a quick correction.

**Best for:** advanced learners, developers, and technical operators building or supervising more serious systems.

**Typical outcomes:**

- workflow redesign for one meaningful class of work
- stronger model-selection and evaluation habits
- practical use of AI agents inside a repeatable work loop
- clearer standards for reliability, review, and accountability

**Price:** `$2,000`

### 3.4 Four-Session Mentorship Sprint

**Format:** four 2-hour sessions over two to four weeks

**Purpose:** sustained coaching for someone who needs repetition, review, and applied refinement rather than one workshop.

**Best for:** practitioners trying to change how they work, not just learn terminology.

**Typical outcomes:**

- reviewed working sessions across multiple weeks
- feedback on orchestration decisions and workflow structure
- improved discipline in evaluation and iteration
- a stronger basis for future apprenticeship consideration

**Price:** `$2,400`

### 3.5 Apprenticeship Screening Path

**Format:** selective, invite-style screening process

**Purpose:** identify whether a strong trainee is ready for bounded supervised execution inside the bottega.

**Best for:** people who have already demonstrated discipline, reliability, and professional standards.

**Typical outcomes:**

- clear readiness assessment
- specific developmental gaps if not yet ready
- possible invitation into bounded supervised project work when appropriate

**Price:** case by case

---

## 4. Recommendation Rules

The system should generally recommend:

1. `Half-Day AI Operator Intensive` when the user has a concrete problem but needs a compact intervention.
2. `Full-Day AI Operator Lab` when the user needs a deeper reset of working methods.
3. `Four-Session Mentorship Sprint` when the user needs repetition, review, and progression.
4. `Apprenticeship Screening Path` only for strong-fit individuals who already show discipline and serious intent.

---

## 5. Public Messaging Rule

The public story should make three things clear:

1. This is serious, hands-on operator training.
2. The work is grounded in real systems and real standards.
3. Apprenticeship is possible, but not automatic.

Training detail pages, package explanation, and proof assets should live as informational pages in the footer rather than as top-nav destinations.

---

## 6. Chat Routing Rule

When the chat detects that the user is an individual rather than an organizational buyer, it should:

1. ask what kind of work they are trying to improve
2. assess current skill and seriousness
3. recommend one of the packages above
4. capture contact information only when a clear training next step exists

---

## 7. Open Questions

1. Whether the mentorship sprint should remain private until demand quality is proven
2. Whether apprenticeship screening should be invite-only in public copy or simply described as selective
3. Which of the three priced packages should be the default individual conversion target

## Build Note

See [implementation-roadmap.md](implementation-roadmap.md) for the phased rollout of the individual lane, package routing, and apprenticeship screening.
