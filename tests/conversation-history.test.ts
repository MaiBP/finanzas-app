import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";

process.env.FIELD_ENCRYPTION_KEY = randomBytes(32).toString("base64");

const { fetchRecentMessages, recordMessage } = await import("@/services/conversation-history");

function createDb() {
  const inserted: { user_id: string; household_id: string; role: string; content: string }[] = [];
  const db = {
    inserted,
    from(table: string) {
      if (table !== "conversation_messages") throw new Error(`unexpected table ${table}`);
      return {
        insert(row: { user_id: string; household_id: string; role: string; content: string }) {
          inserted.push(row);
          return Promise.resolve({ data: null, error: null });
        },
        select() {
          return this;
        },
        eq() {
          return this;
        },
        order() {
          return this;
        },
        limit() {
          // Mirrors the real query's .order("created_at", { ascending: false }): most recent first.
          return Promise.resolve({ data: [...inserted].reverse().map((row) => ({ role: row.role, content: row.content })) });
        },
      };
    },
  };
  return db as unknown as Parameters<typeof fetchRecentMessages>[0] & typeof db;
}

describe("conversation history encryption", () => {
  it("stores the message content encrypted, never as plaintext", async () => {
    const db = createDb();
    await recordMessage(db, { userId: "user-1", householdId: "household-1", role: "user", content: "gasté 42 en Mercadona" });
    expect(db.inserted[0].content).not.toBe("gasté 42 en Mercadona");
    expect(db.inserted[0].content.startsWith("enc:v1:")).toBe(true);
  });

  it("decrypts stored messages back to their original content", async () => {
    const db = createDb();
    await recordMessage(db, { userId: "user-1", householdId: "household-1", role: "user", content: "¿cuál es mi saldo?" });
    await recordMessage(db, { userId: "user-1", householdId: "household-1", role: "assistant", content: "Tu saldo es 100 €." });
    const messages = await fetchRecentMessages(db, "user-1");
    expect(messages).toEqual([
      { role: "user", content: "¿cuál es mi saldo?" },
      { role: "assistant", content: "Tu saldo es 100 €." },
    ]);
  });
});
