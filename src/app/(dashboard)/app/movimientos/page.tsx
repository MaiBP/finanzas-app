import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { getCurrentHousehold } from "@/lib/household";
import { formatMoney } from "@/lib/finance/money";
import { softDeleteTransaction } from "../actions";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Banner } from "@/components/ui/banner";

type Row = {
  id: string;
  created_by: string;
  created_at: string;
  type: "expense" | "income";
  amount_cents: number;
  description: string;
  transaction_date: string;
  scope: string;
  categories: { name: string } | null;
  accounts: { name: string } | null;
};
type MemberRow = {
  user_id: string;
  profiles: { display_name: string | null } | null;
};

const PAGE_SIZE = 25;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    from?: string;
    to?: string;
    page?: string;
    error?: string;
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
  const from = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? "") ? params.from : undefined;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? "") ? params.to : undefined;

  let query = supabase
    .from("transactions")
    .select(
      "id,created_by,created_at,type,amount_cents,description,transaction_date,scope,categories(name),accounts(name)",
      { count: "exact" },
    )
    .eq("household_id", household.id)
    .eq("scope", "shared")
    .eq("status", "confirmed")
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
  if (search) query = query.ilike("description", `%${search.replace(/[%_]/g, "")}%`);
  if (type) query = query.eq("type", type);
  if (from) query = query.gte("transaction_date", from);
  if (to) query = query.lte("transaction_date", to);

  const [{ data, count }, { data: membersData }] = await Promise.all([
    query,
    supabase
      .from("household_members")
      .select("user_id,profiles(display_name)")
      .eq("household_id", household.id),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  const members = (membersData ?? []) as unknown as MemberRow[];
  const memberNames = new Map(
    members.map((member) => [
      member.user_id,
      member.profiles?.display_name ?? "Miembro",
    ]),
  );
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(search || type || from || to);
  const exportParams = new URLSearchParams();
  if (search) exportParams.set("q", search);
  if (type) exportParams.set("type", type);
  if (from) exportParams.set("from", from);
  if (to) exportParams.set("to", to);
  const exportQuery = exportParams.toString();
  const exportHref = `/app/movimientos/exportar${exportQuery ? `?${exportQuery}` : ""}`;
  const paginationHref = (targetPage: number) => {
    const next = new URLSearchParams();
    if (search) next.set("q", search);
    if (type) next.set("type", type);
    if (from) next.set("from", from);
    if (to) next.set("to", to);
    if (targetPage > 1) next.set("page", String(targetPage));
    const queryString = next.toString();
    return `/app/movimientos${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-(--muted)">Todo en un sitio</p>
          <h1 className="text-3xl font-black">Movimientos</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={exportHref} variant="outline" size="sm">
            <Download size={18} /> {hasFilters ? "Excel · selección" : "Excel · todo"}
          </LinkButton>
          <LinkButton href="/app/movimientos/nuevo" size="sm">
            <Plus size={18} /> Nuevo movimiento
          </LinkButton>
        </div>
      </div>
      <Banner kind="error">{params.error}</Banner>
      <form className="card mt-6 p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_160px_160px_160px_auto] xl:items-end">
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
            <span className="label">Desde</span>
            <input className="field" type="date" name="from" defaultValue={from} />
          </label>
          <label>
            <span className="label">Hasta</span>
            <input className="field" type="date" name="to" defaultValue={to} />
          </label>
          <div className="flex gap-2 md:col-span-2 xl:col-span-1">
            <Button type="submit" className="min-h-12 flex-1 xl:flex-none">
              Aplicar filtros
            </Button>
            {hasFilters && (
              <LinkButton href="/app/movimientos" aria-label="Limpiar filtros" variant="inverse" size="icon">
                <X size={18} />
              </LinkButton>
            )}
          </div>
        </div>
      </form>
      <section className="card mt-5 overflow-hidden">
        <div className="hidden grid-cols-[minmax(0,1.2fr)_120px_110px_110px_100px_120px_76px] gap-3 border-b border-black/10 px-6 py-3 text-xs font-bold uppercase tracking-wide text-(--muted) xl:grid">
          <span>Descripción</span><span>Registrado por</span><span>Cuenta</span>
          <span>Categoría</span><span>Fecha</span>
          <span className="text-right">Importe</span><span />
        </div>
        {rows.map((row) => {
          const creator = memberNames.get(row.created_by) ?? "Miembro";
          return (
            <article
              key={row.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-black/10 p-4 xl:grid-cols-[minmax(0,1.2fr)_120px_110px_110px_100px_120px_76px] xl:items-center xl:px-6"
            >
              <div className="min-w-0">
                <p className="truncate font-bold">{row.description}</p>
                <p className="mt-1 text-xs text-(--muted) xl:hidden">
                  {row.accounts?.name ?? "Sin cuenta"} · {row.categories?.name ?? "Sin categoría"} · {row.transaction_date}
                </p>
                <p className="mt-1 text-xs font-bold xl:hidden">Registrado por {creator}</p>
              </div>
              <span className="hidden truncate text-sm font-bold xl:block">{creator}</span>
              <span className="hidden truncate text-sm font-bold xl:block">{row.accounts?.name ?? "Sin cuenta"}</span>
              <span className="hidden truncate text-sm xl:block">{row.categories?.name ?? "Sin categoría"}</span>
              <span className="hidden text-sm text-(--muted) xl:block">{row.transaction_date}</span>
              <b className={`self-start text-right xl:self-auto ${row.type === "income" ? "text-(--ink)" : ""}`}>
                {row.type === "expense" ? "−" : "+"}{formatMoney(row.amount_cents)}
              </b>
              {row.created_by === user.id ? (
                <div className="col-start-2 flex justify-end xl:col-auto">
                  <Link href={`/app/movimientos/${row.id}/editar`} aria-label={`Editar ${row.description}`} className="rounded-lg p-2">
                    <Pencil size={17} />
                  </Link>
                  <form action={softDeleteTransaction}>
                    <input type="hidden" name="id" value={row.id} />
                    <button aria-label={`Eliminar ${row.description}`} className="rounded-lg p-2">
                      <Trash2 size={17} />
                    </button>
                  </form>
                </div>
              ) : <span />}
            </article>
          );
        })}
        {!rows.length && (
          <EmptyState
            icon={Search}
            title="No hay movimientos"
            description="Prueba otros filtros o añade el primero."
            action={{ label: "Nuevo movimiento", href: "/app/movimientos/nuevo" }}
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
