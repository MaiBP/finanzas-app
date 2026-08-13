import { describe, expect, it } from "vitest";
import { redactHouseholdNames, redactRecentMessages } from "@/services/privacy/redact-household-names";

const members = [
  { userId: "user-1", displayName: "Maira" },
  { userId: "user-2", displayName: "Cristian" },
];

describe("redactHouseholdNames", () => {
  it("replaces the asker's own name with 'tú'", () => {
    const result = redactHouseholdNames("¿Cuánto gastó Maira este mes?", members, "user-1");
    expect(result.text).toBe("¿Cuánto gastó tú este mes?");
    expect(result.mentioned).toBe(true);
  });

  it("replaces the partner's name with 'tu pareja'", () => {
    const result = redactHouseholdNames("¿Cuánto gastó Cristian este mes?", members, "user-1");
    expect(result.text).toBe("¿Cuánto gastó tu pareja este mes?");
    expect(result.mentioned).toBe(true);
  });

  it("is case-insensitive", () => {
    const result = redactHouseholdNames("cuanto gasto cristian", members, "user-1");
    expect(result.text).toBe("cuanto gasto tu pareja");
  });

  it("does not report a mention when no name appears", () => {
    const result = redactHouseholdNames("¿cuánto gasté este mes?", members, "user-1");
    expect(result.text).toBe("¿cuánto gasté este mes?");
    expect(result.mentioned).toBe(false);
  });

  it("does not match a name as a substring of another word", () => {
    const membersWithAna = [{ userId: "user-3", displayName: "Ana" }];
    const result = redactHouseholdNames("me compré una banana", membersWithAna, "user-1");
    expect(result.text).toBe("me compré una banana");
    expect(result.mentioned).toBe(false);
  });

  it("ignores members without a display name", () => {
    const result = redactHouseholdNames("hola", [{ userId: "user-1", displayName: null }], "user-1");
    expect(result.text).toBe("hola");
    expect(result.mentioned).toBe(false);
  });
});

describe("redactRecentMessages", () => {
  it("redacts every message and aggregates the mentioned flag", () => {
    const messages = [
      { role: "user" as const, content: "hola Cristian" },
      { role: "assistant" as const, content: "todo bien" },
    ];
    const result = redactRecentMessages(messages, members, "user-1");
    expect(result.messages[0].content).toBe("hola tu pareja");
    expect(result.messages[1].content).toBe("todo bien");
    expect(result.mentioned).toBe(true);
  });
});
