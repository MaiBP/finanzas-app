import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeTelegramAction } from "@/services/transaction-service/telegram";
import { decryptField, encryptField } from "@/lib/security/field-encryption";
import type { FinancialAction } from "@/services/financial-message-parser/schema";

// encryptField/decryptField read FIELD_ENCRYPTION_KEY lazily at call time, so setting it here
// (before any test body runs) is enough — no need to defer the imports above.
process.env.FIELD_ENCRYPTION_KEY = randomBytes(32).toString("base64");

function chainable(result: { data: unknown; error: null }) {
  const proxy: unknown = new Proxy(() => undefined, {
    get(_target, prop) {
      if (prop === "then") return (resolve: (value: unknown) => void) => resolve(result);
      return () => proxy;
    },
  });
  return proxy;
}

function createDb(
  rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: null }>,
  existingTransactions: { description: string }[] = [],
) {
  return {
    from(table: string) {
      if (table === "categories") return chainable({ data: { id: "cat-1", name: "Supermercado", kind: "expense" }, error: null });
      if (table === "accounts") return chainable({ data: [{ id: "acc-1", name: "Banco" }], error: null });
      if (table === "transactions") return chainable({ data: existingTransactions, error: null });
      throw new Error(`unexpected table ${table}`);
    },
    rpc,
  } as unknown as SupabaseClient;
}

const baseData = {
  type: "expense" as const, amount_cents: 8400, currency: "EUR" as const, description: "Mercadona",
  category: "Supermercado", scope: "shared" as const, privacy: "visible" as const, transaction_date: "2026-08-02",
  paid_by: "user-1", account_name: null, split_type: "equal" as const, wants_new_account: false,
};

describe("executeTelegramAction with an itemized create_transaction", () => {
  it("encrypts item descriptions and normalizes subcategories before calling the RPC", async () => {
    let rpcParams: Record<string, unknown> | undefined;
    const db = createDb(async (_name, params) => { rpcParams = params; return { data: "tx-1", error: null }; });
    const action: FinancialAction = {
      action: "create_transaction", confidence: 0.95, requires_confirmation: false,
      data: {
        ...baseData,
        items: [
          { description: "Pollo", amount_cents: 2500, subcategory: "Carnes y pescado" },
          { description: "Bistec de ternera", amount_cents: 2500, subcategory: "carnes y pescado" },
        ],
      },
    };

    await executeTelegramAction(db, "user-1", "household-1", action);

    expect(rpcParams).toBeDefined();
    const items = rpcParams!.p_items as { description: string; amount_cents: number; subcategory: string }[];
    expect(items).toHaveLength(2);
    expect(decryptField(items[0].description)).toBe("Pollo");
    expect(items[0].amount_cents).toBe(2500);
    expect(items[1].subcategory).toBe("Carnes y pescado");
  });

  it("passes null items when the action has no breakdown", async () => {
    let rpcParams: Record<string, unknown> | undefined;
    const db = createDb(async (_name, params) => { rpcParams = params; return { data: "tx-1", error: null }; });
    const action: FinancialAction = {
      action: "create_transaction", confidence: 0.95, requires_confirmation: false,
      data: { ...baseData, items: null },
    };

    await executeTelegramAction(db, "user-1", "household-1", action);

    expect(rpcParams!.p_items).toBeNull();
  });
});

describe("executeTelegramAction duplicate detection", () => {
  it("declines to create a second row matching an existing confirmed transaction", async () => {
    let rpcCalled = false;
    const existing = { description: encryptField("Mercadona") };
    const db = createDb(async () => { rpcCalled = true; return { data: "tx-2", error: null }; }, [existing]);
    const action: FinancialAction = {
      action: "create_transaction", confidence: 0.95, requires_confirmation: false,
      data: { ...baseData, items: null },
    };

    const reply = await executeTelegramAction(db, "user-1", "household-1", action);

    expect(reply).toContain("ya está registrado");
    expect(rpcCalled).toBe(false);
  });

  it("still creates a transaction when the description doesn't match any existing row", async () => {
    let rpcCalled = false;
    const existing = { description: encryptField("Netflix") };
    const db = createDb(async () => { rpcCalled = true; return { data: "tx-3", error: null }; }, [existing]);
    const action: FinancialAction = {
      action: "create_transaction", confidence: 0.95, requires_confirmation: false,
      data: { ...baseData, items: null },
    };

    const reply = await executeTelegramAction(db, "user-1", "household-1", action);

    expect(reply).toContain("He registrado");
    expect(rpcCalled).toBe(true);
  });
});
