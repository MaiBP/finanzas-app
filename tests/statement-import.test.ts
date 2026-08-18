import { describe, expect, it } from "vitest";
import { isPersonalStatementImport, isSupportedStatementFile, statementImportPayloadSchema, statementPreview } from "@/services/statement-import";

const payload=statementImportPayloadSchema.parse({
  kind:"statement_import",file_name:"julio.pdf",account_name:"Banco",scope:"shared",omitted_rows:1,note:"",
  transactions:[
    {type:"expense",amount_cents:1250,description:"Supermercado",category:"Supermercado",transaction_date:"2026-07-03"},
    {type:"income",amount_cents:5000,description:"Reembolso",category:"Reembolso",transaction_date:"2026-07-05"},
  ],
});

const itemizedPayload=statementImportPayloadSchema.parse({
  kind:"statement_import",file_name:"ticket.jpg",account_name:"Banco",scope:"shared",omitted_rows:0,note:"",
  transactions:[
    {type:"expense",amount_cents:8400,description:"Mercadona",category:"Supermercado",transaction_date:"2026-08-02",items:[
      {description:"Patatas fritas",amount_cents:200,subcategory:"Snacks y dulces"},
      {description:"Agua mineral",amount_cents:150,subcategory:"Bebidas"},
    ]},
  ],
});

describe("statement import",()=>{
  it("accepts statements and supported images",()=>{
    expect(isSupportedStatementFile("resumen.PDF","application/pdf")).toBe(true);
    expect(isSupportedStatementFile("cuenta.xlsx","application/octet-stream")).toBe(true);
    expect(isSupportedStatementFile("foto","image/jpeg")).toBe(true);
    expect(isSupportedStatementFile("archivo.zip","application/zip")).toBe(false);
  });

  it("uses shared scope unless personal is explicit",()=>{
    expect(isPersonalStatementImport("Resumen de julio")).toBe(false);
    expect(isPersonalStatementImport("Cargar en mi cuenta personal")).toBe(true);
  });

  it("previews totals and requires confirmation",()=>{
    const preview=statementPreview(payload,[{name:"Banco"}]);
    expect(preview).toContain("2 movimientos");
    expect(preview).toContain("12,50 €");
    expect(preview).toContain("Cuenta: Banco");
    expect(preview).toContain("Responde “sí”");
  });

  it("accepts itemized transactions and lists each product in the preview",()=>{
    expect(itemizedPayload.transactions[0].items).toHaveLength(2);
    const preview=statementPreview(itemizedPayload,[{name:"Banco"}]);
    expect(preview).toContain("Patatas fritas");
    expect(preview).toContain("Agua mineral");
    expect(preview).toContain("Snacks y dulces");
    expect(preview).toContain("1 movimiento");
    expect(preview).not.toContain("0,00");
  });
});
