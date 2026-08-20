import { getCurrentHousehold } from "@/lib/household";
import { decryptField } from "@/lib/security/field-encryption";

function normalize(value: string) {
  return value.normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "").toLocaleLowerCase("es").trim();
}

type ExportItem = { description: string; amount_cents: number; subcategory: string };
type ExportRow = {
  type: "expense" | "income";
  amount_cents: number;
  description: string;
  transaction_date: string;
  categories: { name: string } | null;
  accounts: { name: string } | null;
  transaction_items: ExportItem[] | null;
};

const CHUNK_SIZE = 1_000;

function safeText(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const { supabase, user, household } = await getCurrentHousehold();
  if (!household) return new Response("No se encontró el hogar", { status: 404 });

  const params = new URL(request.url).searchParams;
  const search = params.get("q")?.trim();
  const type = params.get("type");
  const from = /^\d{4}-\d{2}-\d{2}$/.test(params.get("from") ?? "") ? params.get("from") : null;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(params.get("to") ?? "") ? params.get("to") : null;
  const rows: ExportRow[] = [];

  for (let offset = 0; ; offset += CHUNK_SIZE) {
    let query = supabase
      .from("transactions")
      .select("type,amount_cents,description,transaction_date,categories(name),accounts(name),transaction_items(description,amount_cents,subcategory)")
      .eq("household_id", household.id)
      .eq("created_by", user.id)
      .eq("scope", "personal")
      .eq("status", "confirmed")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + CHUNK_SIZE - 1);
    if (type === "expense" || type === "income") query = query.eq("type", type);
    if (from) query = query.gte("transaction_date", from);
    if (to) query = query.lte("transaction_date", to);
    const { data, error } = await query;
    if (error) return new Response("No se pudo preparar la exportación", { status: 500 });
    const chunk = ((data ?? []) as unknown as ExportRow[]).map((row) => ({
      ...row,
      description: decryptField(row.description),
      transaction_items: row.transaction_items?.map((item) => ({ ...item, description: decryptField(item.description) })) ?? null,
    }));
    rows.push(...chunk);
    if (chunk.length < CHUNK_SIZE) break;
  }
  // Description is encrypted, so the search term is matched in JS after decrypting above.
  const matchedRows = search ? rows.filter((row) => normalize(row.description).includes(normalize(search))) : rows;

  // Every row shares the transaction-level columns (Fecha..Cuenta) so the sheet stays filterable
  // either way; product rows leave Importe (EUR) blank and use Importe producto (EUR) instead,
  // since item amounts don't have to add up to the transaction total and would otherwise silently
  // double-count a naive sum of one shared amount column.
  const header = ["Fecha", "Tipo", "Descripción", "Categoría", "Cuenta", "Importe (EUR)", "Producto", "Subcategoría producto", "Importe producto (EUR)"];
  const lines = ["sep=;", header.map(csvCell).join(";")];
  for (const row of matchedRows) {
    const amount = ((row.type === "income" ? 1 : -1) * row.amount_cents / 100).toFixed(2).replace(".", ",");
    const sharedCells = [
      row.transaction_date,
      row.type === "income" ? "Ingreso" : "Gasto",
      safeText(row.description),
      safeText(row.categories?.name ?? "Sin categoría"),
      safeText(row.accounts?.name ?? "Sin cuenta"),
    ];
    lines.push([...sharedCells, amount, "", "", ""].map(csvCell).join(";"));
    for (const item of row.transaction_items ?? []) {
      const itemAmount = ((row.type === "income" ? 1 : -1) * item.amount_cents / 100).toFixed(2).replace(".", ",");
      lines.push([...sharedCells, "", safeText(item.description), safeText(item.subcategory), itemAmount].map(csvCell).join(";"));
    }
  }

  const dateSuffix = new Date().toISOString().slice(0, 10);
  return new Response(`﻿${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="miti-miti-movimientos-personales-${dateSuffix}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
