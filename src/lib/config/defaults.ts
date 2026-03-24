/**
 * Config type definitions and hardcoded fallback values.
 * When config files are absent, the system uses these defaults —
 * identical behavior to before Sprint 0.
 */

// ── Type definitions ────────────────────────────────────────────────

export interface InstanceIdentity {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  domain: string;
  logoPath: string;
  markText: string;
  accentColor?: string;
  copyright?: string;
  serviceChips?: string[];
  fonts?: {
    body: string;
    display: string;
    mono: string;
  };
  analytics?: {
    plausibleDomain?: string;
    plausibleSrc?: string;
  };
}

export interface InstancePrompts {
  personality?: string;
  heroHeading?: string;
  heroSubheading?: string;
  firstMessage?: {
    default?: string;
    withReferral?: string;
  };
  defaultSuggestions?: string[];
  referralSuggestions?: string[];
}

export interface ServiceOffering {
  id: string;
  name: string;
  description: string;
  lane: "organization" | "individual" | "both";
  estimatedPrice?: number;
  estimatedHours?: number;
}

export interface InstanceServices {
  offerings: ServiceOffering[];
  bookingEnabled: boolean;
}

export interface InstanceTools {
  enabled?: string[];
  disabled?: string[];
}

export interface FullInstanceConfig {
  identity: InstanceIdentity;
  prompts: InstancePrompts;
  services: InstanceServices;
  tools: InstanceTools;
}

// ── Default values (extracted from pre-Sprint-0 hardcoded constants) ─

export const DEFAULT_IDENTITY: InstanceIdentity = {
  name: "Studio Ordo",
  shortName: "Ordo",
  tagline: "Strategic AI Advisory",
  description:
    "Founder-led strategic AI advisory, orchestration architecture, and rigorous training for serious teams and practitioners working with agentic systems.",
  domain: "studioordo.com",
  logoPath: "/ordo-avatar.png",
  markText: "O",
  copyright: "© 2026 Studio Ordo. All rights reserved.",
  serviceChips: [
    "Studio Ordo",
    "Strategic AI Advisory",
    "Orchestration Training",
  ],
  fonts: {
    body: "IBM Plex Sans",
    display: "Fraunces",
    mono: "IBM Plex Mono",
  },
};

export const DEFAULT_PROMPTS: InstancePrompts = {
  heroHeading: "Bring me the workflow.",
  heroSubheading:
    "Paste a workflow, AI plan, or team handoff. I\u2019ll show you what to fix, what to train, and what to build.",
  firstMessage: {
    default:
      "Describe the workflow problem, orchestration gap, or training goal.",
    withReferral:
      "Welcome — I see you were introduced by {{referrer.name}}, a {{referrer.credential}} in the Enterprise AI program. How can {{brand.name}} help you today?",
  },
  defaultSuggestions: [
    "Audit this workflow",
    "Stress-test this AI plan",
    "Train my team",
    "Show me the weak point",
  ],
  referralSuggestions: [
    "Tell me what {{referrer.name}} does",
    "I'm interested in AI for my business",
    "I want to learn AI orchestration",
    "How does the referral program work?",
  ],
};

export const DEFAULT_SERVICES: InstanceServices = {
  offerings: [],
  bookingEnabled: false,
};

export const DEFAULT_TOOLS: InstanceTools = {};

export const DEFAULT_CONFIG: FullInstanceConfig = {
  identity: DEFAULT_IDENTITY,
  prompts: DEFAULT_PROMPTS,
  services: DEFAULT_SERVICES,
  tools: DEFAULT_TOOLS,
};
