import { Bell } from "lucide-react";
import { getCurrentHousehold } from "@/lib/household";
import { decryptField } from "@/lib/security/field-encryption";
import { formatMoney } from "@/lib/finance/money";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { MAX_ACTIVE_REMINDERS, nextRecurringOccurrence } from "@/services/reminders";
import { deleteReminder, updateReminderAction } from "../actions";

type ReminderRow = {
  id: string;
  description: string;
  scope: "personal" | "shared";
  is_recurring: boolean;
  day_of_month: number | null;
  reminder_date: string | null;
  remind_days_before: number;
  amount_cents: number | null;
};

export default async function RemindersPage() {
  const { supabase, household } = await getCurrentHousehold();
  if (!household) return null;
  const today = new Date().toISOString().slice(0, 10);
  // RLS already narrows this to shared reminders plus the current user's own personal ones.
  const { data } = await supabase
    .from("reminders")
    .select("id,description,scope,is_recurring,day_of_month,reminder_date,remind_days_before,amount_cents")
    .eq("household_id", household.id)
    .eq("active", true);
  const reminders = ((data ?? []) as ReminderRow[])
    .map((reminder) => ({
      ...reminder,
      description: decryptField(reminder.description),
      nextDate: reminder.is_recurring ? nextRecurringOccurrence(reminder.day_of_month!, today) : reminder.reminder_date!,
    }))
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));

  return (
    <>
      <p className="text-sm font-bold uppercase">Piggy te avisa</p>
      <h1 className="mt-1 text-3xl font-black">Recordatorios</h1>
      <p className="mt-2 max-w-2xl text-(--muted)">
        Creá recordatorios contándoselos a Piggy por chat o Telegram (p. ej. &ldquo;recordame pagar el alquiler el día 5&rdquo;). Acá podés editarlos o eliminarlos. Máximo {MAX_ACTIVE_REMINDERS} activos por hogar.
      </p>

      <div className="mt-7 grid gap-4">
        {reminders.map((reminder) => (
          <article key={reminder.id} className="card overflow-hidden">
            <div className="flex items-center gap-3 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-(--highlight)">
                <Bell size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{reminder.description}</p>
                <p className="text-xs text-(--muted)">
                  {reminder.is_recurring ? `Todos los meses el día ${reminder.day_of_month}` : `El ${reminder.reminder_date}`}
                  {reminder.remind_days_before > 0 ? `, ${reminder.remind_days_before} ${reminder.remind_days_before === 1 ? "día" : "días"} antes` : ""}
                  {reminder.amount_cents != null ? ` · ${formatMoney(reminder.amount_cents, household.baseCurrency)}` : ""}
                  {" · "}
                  {reminder.scope === "shared" ? "Compartido" : "Personal"}
                </p>
              </div>
              <form action={deleteReminder}>
                <input type="hidden" name="id" value={reminder.id} />
                <SubmitButton variant="outline" size="sm" fullWidth={false} pendingText="Eliminando…">
                  Eliminar
                </SubmitButton>
              </form>
            </div>
            <details className="border-t border-(--ink)/15 bg-white p-5">
              <summary className="cursor-pointer text-sm font-black">Editar</summary>
              <form action={updateReminderAction} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={reminder.id} />
                <label className="sm:col-span-2">
                  <span className="label">Descripción</span>
                  <input className="field" name="description" defaultValue={reminder.description} required maxLength={160} />
                </label>
                {reminder.is_recurring ? (
                  <label>
                    <span className="label">Día del mes</span>
                    <input className="field" name="day_of_month" type="number" min={1} max={31} defaultValue={reminder.day_of_month ?? undefined} required />
                  </label>
                ) : (
                  <label>
                    <span className="label">Fecha</span>
                    <input className="field" name="reminder_date" type="date" defaultValue={reminder.reminder_date ?? undefined} required />
                  </label>
                )}
                <label>
                  <span className="label">Avisar con anticipación (días)</span>
                  <input className="field" name="remind_days_before" type="number" min={0} max={10} defaultValue={reminder.remind_days_before} required />
                </label>
                <label className="sm:col-span-2">
                  <span className="label">Importe aproximado (opcional)</span>
                  <input className="field" name="amount" inputMode="decimal" placeholder="0,00" defaultValue={reminder.amount_cents != null ? (reminder.amount_cents / 100).toFixed(2).replace(".", ",") : ""} />
                </label>
                <SubmitButton size="sm" fullWidth={false} className="sm:col-span-2 sm:justify-self-start">
                  Guardar cambios
                </SubmitButton>
              </form>
            </details>
          </article>
        ))}
        {!reminders.length && (
          <div className="card">
            <EmptyState
              icon={Bell}
              title="Todavía no tenés recordatorios"
              description={'Contale a Piggy algo como "recordame pagar el alquiler el día 5 de cada mes" y aparece acá.'}
            />
          </div>
        )}
      </div>
    </>
  );
}
