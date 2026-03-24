export interface GreetingContext {
  referrer?: {
    name?: string;
    credential?: string;
  };
  brand: {
    name: string;
  };
}

const FALLBACKS: Record<string, string> = {
  "referrer.name": "a colleague",
  "referrer.credential": "Enterprise AI practitioner",
};

const PLACEHOLDER_RE = /\{\{(referrer\.name|referrer\.credential|brand\.name)\}\}/g;

export function interpolateGreeting(
  template: string,
  context: GreetingContext,
): string {
  return template.replace(PLACEHOLDER_RE, (_match, key: string) => {
    switch (key) {
      case "referrer.name":
        return context.referrer?.name ?? FALLBACKS["referrer.name"];
      case "referrer.credential":
        return context.referrer?.credential ?? FALLBACKS["referrer.credential"];
      case "brand.name":
        return context.brand.name;
      default:
        return _match;
    }
  });
}
