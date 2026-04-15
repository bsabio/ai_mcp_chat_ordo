import { describe, expect, it } from "vitest";

import { MessageFactory } from "./MessageFactory";

describe("MessageFactory.createHeroMessage", () => {
  it("appends response-state and suggestions tags to hero content", () => {
    const message = MessageFactory.createHeroMessage("Welcome to Studio Ordo.", [
      "Start with the library",
      "Show the roadmap",
    ]);

    expect(message.role).toBe("assistant");
    expect(message.parts).toEqual([]);
    expect(message.metadata).toEqual({ responseState: "open" });
    expect(message.content).toBe(
      'Welcome to Studio Ordo.\n\n__response_state__:"open"\n\n__suggestions__:["Start with the library","Show the roadmap"]',
    );
  });

  it("keeps an explicit open-state contract even when hero suggestions are empty", () => {
    const message = MessageFactory.createHeroMessage("Welcome to Studio Ordo.", []);

    expect(message.metadata).toEqual({ responseState: "open" });
    expect(message.content).toBe('Welcome to Studio Ordo.\n\n__response_state__:"open"\n\n__suggestions__:[]');
  });
});