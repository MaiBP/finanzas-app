import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import { getCurrentHousehold } from "@/lib/household";
import { formatMoney } from "@/lib/finance/money";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Banner } from "@/components/ui/banner";
import { DeleteTransactionButton } from "@/components/transactions/delete-transaction-button";
import { DeletedAccountsPanel } from "@/components/transactions/deleted-accounts-panel";
import { decryptField } from "@/lib/security/field-encryption";
import { SYNTHETIC_BALANCE_CATEGORY } from "@/lib/finance/synthetic-transactions";

type Row = {
  id: string;
  created_at: string;
  type: "expense" | "income";
  amount_cents: number;
  description: string;
  transaction_date: string;
  categories: { name: string } | null;
  accounts: { name: string } | null;
};
type ItemRow = { transaction_id: string; description: string; amount_cents: number; subcategory: string };

const PAGE_SIZE = 25;
// Description is encrypted at rest (non-deterministic ciphertext), so a text search can't run
// as a SQL ilike anymore — fetch a bounded window, decrypt, and filter/paginate in JS instead.
const SEARCH_FETCH_LIMIT = 1000;
const DIACRITICS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

function normalize(value: string) {
  return value.normalize("NFD").replace(DIACRITICS_PATTERN, "").toLocaleLowerCase("es").trim();
}

function monthEnd(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
}

export default async function PersonalTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    from?: string;
    to?: string;
    page?: string;
    error?: string;
    currency?: string;
    month?: string;
  }>;
}) {
  const params = await searchParams;
  const { supabase, user, household } = await getCurrentHousehold();
  if (!household) return null;

  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const offset = (page - 1) * PAGE_SIZE;
  const search = params.q?.trim();
  const type = params.type === "expense" || params.type === "income" ? params.type : undefined;
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month : undefined;
  // A picked month is a shortcut for a from/to range, and wins over manually typed dates so the
  // two filters never silently disagree with each other.
  const from = month ? `${month}-01` : /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? "") ? params.from : undefined;
  const to = month ? monthEnd(month) : /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? "") ? params.to : undefined;

  const [{ data: currencyRows }, { data: profile }] = await Promise.all([
    supabase.from("accounts").select("id,currency").eq("household_id", household.id).eq("owner_user_id", user.id).eq("is_shared", false).is("archived_at", null),
    supabase.from("profiles").select("personal_base_currency").eq("id", user.id).maybeSingle(),
  ]);
  const baseCurrency = profile?.personal_base_currency ?? "EUR";
  const accountsByCurrency = (currencyRows ?? []) as { id: string; currency: string }[];
  const availableCurrencies = [...new Set(accountsByCurrency.map((account) => account.currency))].sort((a, b) => a === baseCurrency ? -1 : b === baseCurrency ? 1 : a.localeCompare(b));
  const currency = params.currency && availableCurrencies.includes(params.currency) ? params.currency : baseCurrency;
  const currencyAccountIds = accountsByCurrency.filter((account) => account.currency === currency).map((account) => account.id);

  let rows: Row[];
  let total: number;
  if (!currencyAccountIds.length) {
    rows = []; total = 0;
  } else if (search) {
    // Description is encrypted, so the search term can't be matched in SQL: fetch a bounded
    // window with the other filters applied, decrypt, then filter and paginate in JS.
    let searchQuery = supabase
      .from("transactions")
      .select("id,created_at,type,amount_cents,description,transaction_date,categories(name),accounts(name)")
      .eq("household_id", household.id)
      .eq("created_by", user.id)
      .eq("scope", "personal")
      .eq("status", "confirmed")
      .in("account_id", currencyAccountIds)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(SEARCH_FETCH_LIMIT);
    if (type) searchQuery = searchQuery.eq("type", type);
    if (from) searchQuery = searchQuery.gte("transaction_date", from);
    if (to) searchQuery = searchQuery.lte("transaction_date", to);
    const { data } = await searchQuery;
    const decrypted = ((data ?? []) as unknown as Row[]).map((row) => ({ ...row, description: decryptField(row.description) }));
    const term = normalize(search);
    const matched = decrypted.filter((row) => normalize(row.description).includes(term));
    total = matched.length;
    rows = matched.slice(offset, offset + PAGE_SIZE);
  } else {
    let query = supabase
      .from("transactions")
      .select(
        "id,created_at,type,amount_cents,description,transaction_date,categories(name),accounts(name)",
        { count: "exact" },
      )
      .eq("household_id", household.id)
      .eq("created_by", user.id)
      .eq("scope", "personal")
      .eq("status", "confirmed")
      .in("account_id", currencyAccountIds)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (type) query = query.eq("type", type);
    if (from) query = query.gte("transaction_date", from);
    if (to) query = query.lte("transaction_date", to);
    const { data, count } = await query;
    rows = ((data ?? []) as unknown as Row[]).map((row) => ({ ...row, description: decryptField(row.description) }));
    total = count ?? 0;
  }
  // Archiving an account isn't itself a financial movement (no amount to show as a row), but
  // it's still worth a trace here — otherwise "why did this account disappear" has no answer in
  // the one place people look for a change history. Backed by the audit_logs trigger on accounts.
  const { data: deletedAccountLogs } = await supabase
    .from("audit_logs")
    .select("id,created_at,new_values")
    .eq("household_id", household.id)
    .eq("entity_type", "account")
    .eq("action", "deleted")
    .order("created_at", { ascending: false })
    .limit(10);
  const deletedAccounts = ((deletedAccountLogs ?? []) as { id: number; created_at: string; new_values: { name?: string; is_shared?: boolean } | null }[])
    // This page only shows personal movements; a shared account's archival note belongs on the
    // household Movimientos page instead, even though RLS lets this user see their own action there too.
    .filter((log) => log.new_values?.is_shared === false)
    .map((log) => ({
      id: log.id,
      name: log.new_values?.name ?? "Cuenta",
      date: log.created_at,
    }));
  const { data: itemRows } = rows.length
    ? await supabase.from("transaction_items").select("transaction_id,description,amount_cents,subcategory").in("transaction_id", rows.map((row) => row.id))
    : { data: [] as ItemRow[] };
  const itemsByTransaction = new Map<string, { description: string; amount_cents: number; subcategory: string }[]>();
  for (const item of (itemRows ?? []) as unknown as ItemRow[]) {
    const decrypted = { description: decryptField(item.description), amount_cents: item.amount_cents, subcategory: item.subcategory };
    itemsByTransaction.set(item.transaction_id, [...(itemsByTransaction.get(item.transaction_id) ?? []), decrypted]);
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(search || type || from || to);
  const exportParams = new URLSearchParams();
  if (search) exportParams.set("q", search);
  if (type) exportParams.set("type", type);
  if (month) exportParams.set("month", month);
  else { if (from) exportParams.set("from", from); if (to) exportParams.set("to", to); }
  if (currency !== baseCurrency) exportParams.set("currency", currency);
  const exportQuery = exportParams.toString();
  const exportHref = `/app/personal/movimientos/exportar${exportQuery ? `?${exportQuery}` : ""}`;
  const paginationHref = (targetPage: number) => {
    const next = new URLSearchParams();
    if (search) next.set("q", search);
    if (type) next.set("type", type);
    if (month) next.set("month", month);
    else { if (from) next.set("from", from); if (to) next.set("to", to); }
    if (currency !== baseCurrency) next.set("currency", currency);
    if (targetPage > 1) next.set("page", String(targetPage));
    const queryString = next.toString();
    return `/app/personal/movimientos${queryString ? `?${queryString}` : ""}`;
  };
  const currencyHref = (targetCurrency: string) => {
    const next = new URLSearchParams();
    if (search) next.set("q", search);
    if (type) next.set("type", type);
    if (month) next.set("month", month);
    else { if (from) next.set("from", from); if (to) next.set("to", to); }
    if (targetCurrency !== baseCurrency) next.set("currency", targetCurrency);
    const queryString = next.toString();
    return `/app/personal/movimientos${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-(--muted)">Todo en un sitio · privado</p>
          <h1 className="text-3xl font-black">Movimientos personales</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={exportHref} variant="outline" size="sm">
            <Download size={18} /> {hasFilters ? "Excel · selección" : "Excel · todo"}
          </LinkButton>
          <LinkButton href="/app/personal/movimientos/nuevo" size="sm">
            <Plus size={18} /> Nuevo movimiento
          </LinkButton>
        </div>
      </div>
      <Banner kind="error">{params.error}</Banner>
      {availableCurrencies.length > 1 && (
        <nav className="mt-5 flex flex-wrap gap-2" aria-label="Moneda">
          {availableCurrencies.map((code) => (
            <Link
              key={code}
              href={currencyHref(code)}
              className={`rounded-full border px-4 py-2 text-sm font-bold ${code === currency ? "border-(--ink) bg-(--ink) text-(--highlight)" : "border-(--ink)/25 text-(--ink) hover:border-(--ink)"}`}
            >
              {code}{code === baseCurrency ? " · base" : ""}
            </Link>
          ))}
        </nav>
      )}
      <form className="card mt-5 p-5">
        <input type="hidden" name="currency" value={currency} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_130px_140px_140px_140px_auto] xl:items-end">
          <label>
            <span className="label">Buscar movimiento</span>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-(--muted)"
                size={17}
              />
              <input
                className="field"
                style={{ paddingLeft: "3rem" }}
                name="q"
                defaultValue={search}
                placeholder="Supermercado, alquiler…"
              />
            </div>
          </label>
          <label>
            <span className="label">Tipo</span>
            <select className="field" name="type" defaultValue={type ?? ""}>
              <option value="">Todos</option>
              <option value="expense">Gastos</option>
              <option value="income">Ingresos</option>
            </select>
          </label>
          <label>
            <span className="label">Mes</span>
            <input className="field" type="month" name="month" defaultValue={month} />
          </label>
          <label>
            <span className="label">Desde</span>
            <input className="field" type="date" name="from" defaultValue={month ? undefined : from} />
          </label>
          <label>
            <span className="label">Hasta</span>
            <input className="field" type="date" name="to" defaultValue={month ? undefined : to} />
          </label>
          <div className="flex gap-2 md:col-span-2 xl:col-span-1">
            <Button type="submit" className="min-h-12 flex-1 xl:flex-none">
              Aplicar filtros
            </Button>
            {hasFilters && (
              <LinkButton href="/app/personal/movimientos" aria-label="Limpiar filtros" variant="inverse" size="icon">
                <X size={18} />
              </LinkButton>
            )}
          </div>
        </div>
      </form>
      <DeletedAccountsPanel accounts={deletedAccounts} />
      <section className="card mt-5 overflow-hidden">
        <div className="hidden grid-cols-[minmax(0,1.3fr)_140px_130px_100px_130px_76px] gap-3 border-b border-black/10 px-6 py-3 text-xs font-bold uppercase tracking-wide text-(--muted) xl:grid">
          <span>Descripción</span><span>Cuenta</span>
          <span>Categoría</span><span>Fecha</span>
          <span className="text-right">Importe</span><span />
        </div>
        {rows.map((row) => {
          const items = itemsByTransaction.get(row.id);
          return (
            <article
              key={row.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-black/10 p-4 xl:grid-cols-[minmax(0,1.3fr)_140px_130px_100px_130px_76px] xl:items-center xl:px-6"
            >
              <div className="min-w-0">
                <p className="truncate font-bold">{row.description}</p>
                <p className="mt-1 text-xs text-(--muted) xl:hidden">
                  {row.accounts?.name ?? "Sin cuenta"} · {row.categories?.name ?? "Sin categoría"} · {row.transaction_date}
                </p>
                {items && items.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-bold text-(--muted)">
                      {items.length} {items.length === 1 ? "producto" : "productos"}
                    </summary>
                    <ul className="mt-1 space-y-0.5 text-xs text-(--muted)">
                      {items.map((item, index) => (
                        <li key={index} className="truncate">
                          {item.description} · {item.subcategory} · {formatMoney(item.amount_cents, currency)}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
              <span className="hidden truncate text-sm font-bold xl:block">{row.accounts?.name ?? "Sin cuenta"}</span>
              <span className="hidden truncate text-sm xl:block">{row.categories?.name ?? "Sin categoría"}</span>
              <span className="hidden text-sm text-(--muted) xl:block">{row.transaction_date}</span>
              <b className={`self-start text-right xl:self-auto ${row.type === "income" ? "text-(--ink)" : ""}`}>
                {row.type === "expense" ? "−" : "+"}{formatMoney(row.amount_cents, currency)}
              </b>
              {row.categories?.name !== SYNTHETIC_BALANCE_CATEGORY ? (
                <div className="col-start-2 flex justify-end xl:col-auto">
                  <Link href={`/app/movimientos/${row.id}/editar`} aria-label={`Editar ${row.description}`} className="rounded-lg p-2">
                    <Pencil size={17} />
                  </Link>
                  <DeleteTransactionButton id={row.id} description={row.description} returnTo="/app/personal/movimientos" />
                </div>
              ) : <span />}
            </article>
          );
        })}
        {!rows.length && (
          <EmptyState
            icon={Search}
            title="No hay movimientos"
            description="Probá otros filtros o añadí el primero."
            action={{ label: "Nuevo movimiento", href: "/app/personal/movimientos/nuevo" }}
          />
        )}
        {total > 0 && (
          <nav aria-label="Paginación de movimientos" className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 bg-white px-4 py-4 sm:px-6">
            <p className="text-sm font-bold text-(--muted)">
              {offset + 1}–{Math.min(offset + rows.length, total)} de {total}
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <LinkButton href={paginationHref(page - 1)} variant="outline" size="sm">
                  <ChevronLeft size={17} /> Anterior
                </LinkButton>
              ) : (
                <span className="flex items-center gap-1 rounded-full border border-black/10 px-4 py-2.5 text-xs font-bold opacity-40">
                  <ChevronLeft size={17} /> Anterior
                </span>
              )}
              <span className="min-w-20 text-center text-sm font-black">{page} / {totalPages}</span>
              {page < totalPages ? (
                <LinkButton href={paginationHref(page + 1)} variant="outline" size="sm">
                  Siguiente <ChevronRight size={17} />
                </LinkButton>
              ) : (
                <span className="flex items-center gap-1 rounded-full border border-black/10 px-4 py-2.5 text-xs font-bold opacity-40">
                  Siguiente <ChevronRight size={17} />
                </span>
              )}
            </div>
          </nav>
        )}
      </section>
    </>
  );
}
