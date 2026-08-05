import { describe, expect, it } from "vitest";
import { loadEnvConfig } from "@next/env";
import { extractStatementTransactions } from "@/services/statement-import";

loadEnvConfig(process.cwd());
const live=process.env.RUN_OPENAI_LIVE==="1";

describe.skipIf(!live)("statement import with OpenAI",()=>{
  it("extracts real rows from a small July CSV",async()=>{
    const csv="Fecha,Descripción,Importe\n03/07/2026,Mercadona,-42.35\n05/07/2026,Nómina,2500.00\n31/07/2026,Saldo final,2457.65\n";
    const result=await extractStatementTransactions({bytes:Buffer.from(csv),fileName:"julio.csv",mimeType:"text/csv"},[
      {name:"Supermercado",kind:"expense"},{name:"Otros",kind:"expense"},{name:"Nómina",kind:"income"},{name:"Otros ingresos",kind:"income"},
    ]);
    expect(result.transactions.some(item=>item.description.toLowerCase().includes("mercadona")&&item.amount_cents===4235)).toBe(true);
    expect(result.transactions.some(item=>item.type==="income"&&item.amount_cents===250000)).toBe(true);
    expect(result.transactions.some(item=>item.description.toLowerCase().includes("saldo"))).toBe(false);
  },60000);
});
