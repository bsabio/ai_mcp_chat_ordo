import type Database from "better-sqlite3";
import path from "node:path";

export function shouldSeedOperatorQaFixtures(db: Database.Database): boolean {
  return path.basename(db.name) === "local.db";
}

export function seedOperatorQaFixtures(db: Database.Database): void {
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT OR IGNORE INTO conversations (
         id,
         user_id,
         title,
         status,
         created_at,
         updated_at,
         message_count,
         session_source,
         lane,
         lane_confidence,
         recommended_next_step,
         detected_need_summary,
         first_message_at
       )
       VALUES (?, ?, ?, 'active', ?, ?, ?, 'authenticated', ?, ?, ?, ?, ?)`
    ).run(
      "conv_seed_revenue_priority",
      "usr_authenticated",
      "Workflow redesign advisory follow-up",
      "2026-03-20T14:00:00.000Z",
      "2026-03-20T14:15:00.000Z",
      5,
      "organization",
      0.92,
      "Follow up with a scoped advisory offer and confirm decision-makers.",
      "Founder-led workflow redesign scope is qualified and ready for direct outreach.",
      "2026-03-20T14:00:00.000Z",
    );

    db.prepare(
      `INSERT OR IGNORE INTO lead_records (
         id,
         conversation_id,
         lane,
         name,
         email,
         organization,
         role_or_title,
         problem_summary,
         recommended_next_action,
         capture_status,
         triage_state,
         founder_note,
         created_at,
         updated_at,
         submitted_at,
         triaged_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', 'new', ?, ?, ?, ?, ?)`
    ).run(
      "lead_seed_revenue_priority",
      "conv_seed_revenue_priority",
      "organization",
      "Morgan Lee",
      "morgan.lee@example.com",
      "Northstar Ops",
      "COO",
      "Needs a founder-scoped workflow redesign to stabilize internal routing and escalation handling.",
      "Send a founder reply with a scoped advisory offer and propose a working session.",
      "Qualified inbound signal from a decision-maker with an active delivery problem.",
      "2026-03-20T14:05:00.000Z",
      "2026-03-20T14:15:00.000Z",
      "2026-03-20T14:05:00.000Z",
      "2026-03-20T14:15:00.000Z",
    );

    db.prepare(
      `INSERT OR IGNORE INTO conversations (
         id,
         user_id,
         title,
         status,
         created_at,
         updated_at,
         message_count,
         session_source,
         lane,
         lane_confidence,
         recommended_next_step,
         detected_need_summary,
         first_message_at
       )
       VALUES (?, ?, ?, 'active', ?, ?, ?, 'authenticated', ?, ?, ?, ?, ?)`
    ).run(
      "conv_seed_training_path",
      "usr_authenticated",
      "Operator mentorship path planning",
      "2026-03-20T13:30:00.000Z",
      "2026-03-20T14:20:00.000Z",
      6,
      "individual",
      0.94,
      "Prepare a founder-approved training path recommendation with mentorship follow-up.",
      "Experienced operator wants a serious AI systems training plan with mentorship and apprenticeship potential.",
      "2026-03-20T13:30:00.000Z",
    );

    db.prepare(
      `INSERT OR IGNORE INTO lead_records (
         id,
         conversation_id,
         lane,
         name,
         email,
         role_or_title,
         training_goal,
         problem_summary,
         recommended_next_action,
         capture_status,
         triage_state,
         created_at,
         updated_at,
         submitted_at,
         triaged_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', 'qualified', ?, ?, ?, ?)`
    ).run(
      "lead_seed_training_path",
      "conv_seed_training_path",
      "individual",
      "Avery Chen",
      "avery.chen@example.com",
      "Platform operator",
      "Build operator-level judgment for reliable AI systems and explore apprenticeship readiness.",
      "Needs a structured training path that blends technical depth, mentorship, and execution practice.",
      "Recommend a founder-approved training path and confirm mentorship cadence.",
      "2026-03-20T13:35:00.000Z",
      "2026-03-20T14:20:00.000Z",
      "2026-03-20T13:35:00.000Z",
      "2026-03-20T14:10:00.000Z",
    );

    db.prepare(
      `INSERT OR IGNORE INTO training_path_records (
         id,
         conversation_id,
         lead_record_id,
         user_id,
         lane,
         current_role_or_background,
         technical_depth,
         primary_goal,
         preferred_format,
         apprenticeship_interest,
         recommended_path,
         fit_rationale,
         customer_summary,
         status,
         next_action,
         founder_note,
         created_at,
         updated_at
       )
       VALUES (?, ?, ?, ?, 'individual', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "tpr_seed_training_path",
      "conv_seed_training_path",
      "lead_seed_training_path",
      "usr_authenticated",
      "Platform operator moving into AI systems orchestration",
      "intermediate",
      "Build reliable operator judgment for AI systems and prepare for mentorship.",
      "hybrid",
      "maybe",
      "mentorship_sprint",
      "Strong fit for founder-guided operator training with room to assess apprenticeship readiness after early milestones.",
      "Customer is ready for a concrete training recommendation and founder follow-up.",
      "recommended",
      "Send the mentorship sprint outline and offer a founder follow-up conversation this week.",
      "Use this record to exercise the training rail CTA during browser QA.",
      "2026-03-20T13:50:00.000Z",
      "2026-03-20T14:20:00.000Z",
    );
  });

  tx();
}