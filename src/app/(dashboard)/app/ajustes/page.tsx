import { AlertTriangle, Check, Copy, Home, Send, UserRound } from "lucide-react";
import { getCurrentHousehold } from "@/lib/household";
import { deleteAccount, generateHouseholdInvite, generateTelegramCode, leaveHousehold, updateHouseholdName, updatePersonalSpaceName } from "./actions";
import { Button } from "@/components/ui/button";
import { getHouseholdRoster } from "@/services/household-roster";
import { TypeToConfirm } from "@/components/settings/type-to-confirm";

export default async function SettingsPage() {
  const { supabase, user, household } = await getCurrentHousehold();
  if (!household) return null;
  const [{ data: invite }, { data: link }, { data: linkCode }, { data: profile }, roster] = await Promise.all([
    household.role === "owner"
      ? supabase
          .from("household_invites")
          .select("code,expires_at")
          .eq("household_id", household.id)
          .is("used_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("telegram_links").select("linked_at").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("telegram_link_codes")
      .select("code,expires_at")
      .eq("user_id", user.id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("personal_space_name").eq("id", user.id).maybeSingle(),
    getHouseholdRoster(supabase, household.id),
  ]);
  const personalSpaceName = profile?.personal_space_name ?? "Mi espacio";
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "Finzy_AssistantBot";
  const partner = roster.find((member) => member.userId !== user.id);
  const partnerName = partner?.displayName ?? "tu pareja";

  return (
    <>
      <p className="text-sm font-bold uppercase">Configuración general</p>
      <h1 className="mt-1 text-3xl font-black">Ajustes</h1>
      <p className="mt-2 max-w-2xl text-(--muted)">
        Administra por separado el espacio del hogar, tu módulo personal y las conexiones que funcionan en toda la
        aplicación.
      </p>

      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <section className="card p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-(--lilac)">
              <Home size={20} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-(--muted)">Espacio compartido</p>
              <h2 className="font-black">Hogar · {household.name}</h2>
            </div>
          </div>
          {household.role === "owner" ? (
            <form action={updateHouseholdName} className="mt-5">
              <label>
                <span className="label">Nombre del hogar</span>
                <input className="field" name="name" defaultValue={household.name} required minLength={2} maxLength={80} />
              </label>
              <Button type="submit" size="sm" className="mt-3">
                Guardar nombre
              </Button>
            </form>
          ) : (
            <p className="mt-5 text-sm text-(--muted)">Solo la persona propietaria puede cambiar el nombre del hogar.</p>
          )}
          <div className="mt-6 border-t border-black/10 pt-5">
            <h3 className="font-black">Invitar al hogar</h3>
            {partner ? (
              <>
                <p className="mt-1 text-sm text-(--muted)">Tu hogar ya está completo.</p>
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-(--lime)/25 p-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-(--lime)">
                    <Check size={18} />
                  </span>
                  <div>
                    <p className="font-bold">Vinculado con {partnerName}</p>
                    <p className="text-xs text-(--muted)">Ya comparten este hogar.</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-(--muted)">Comparte este código con tu pareja. Caduca automáticamente.</p>
                {household.role === "owner" ? (
                  invite ? (
                    <div className="mt-4 flex items-center justify-between rounded-xl bg-(--canvas) p-4">
                      <code className="text-xl font-black tracking-[.2em]">{invite.code}</code>
                      <Copy size={18} />
                    </div>
                  ) : (
                    <div className="mt-4">
                      <p className="text-sm text-(--muted)">Todavía no tienes un código activo.</p>
                      <form action={generateHouseholdInvite}>
                        <Button type="submit" size="sm" className="mt-3">
                          Generar código de invitación
                        </Button>
                      </form>
                    </div>
                  )
                ) : (
                  <p className="mt-4 text-sm">La invitación la administra la persona propietaria.</p>
                )}
              </>
            )}
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-(--lime)">
              <UserRound size={20} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-(--muted)">Espacio privado</p>
              <h2 className="font-black">Personal · {personalSpaceName}</h2>
            </div>
          </div>
          <form action={updatePersonalSpaceName} className="mt-5">
            <label>
              <span className="label">Nombre de tu espacio personal</span>
              <input
                className="field"
                name="name"
                defaultValue={personalSpaceName}
                required
                minLength={2}
                maxLength={50}
                placeholder="Mis finanzas"
              />
            </label>
            <Button type="submit" size="sm" className="mt-3">
              Guardar nombre
            </Button>
          </form>
          <p className="mt-5 rounded-xl bg-(--lime)/25 p-4 text-sm">
            Este nombre solo organiza tu experiencia. Las cuentas y movimientos personales continúan siendo privados
            para ti.
          </p>
        </section>

        <section className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-(--blue)">
              <Send size={20} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-(--muted)">Herramienta general</p>
              <h2 className="font-black">Telegram · Miti-Miti</h2>
              <p className="text-sm text-(--muted)">{link ? "Vinculado" : "No vinculado"}</p>
            </div>
          </div>
          {link ? (
            <div className="mt-5 space-y-3 rounded-xl bg-(--blue)/25 p-4 text-sm">
              <p>
                El bot puede consultar tus espacios, registrar movimientos y leer extractos PDF, Excel, CSV o
                imágenes de hasta 12 MB.
              </p>
              <p className="text-xs text-[#51635e]">
                Los adjuntos no se guardan en Miti-Miti. Se procesan con OpenAI usando <code>store: false</code>; la
                API puede conservar registros de seguridad hasta 30 días según la configuración de tu proyecto.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-5 rounded-xl bg-(--blue)/25 p-4 text-sm">
                <p className="font-bold">Vincula el bot correcto:</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>
                    Abre{" "}
                    <a className="font-black underline" href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer">
                      @{botUsername}
                    </a>{" "}
                    y pulsa Iniciar.
                  </li>
                  <li>Genera un código aquí.</li>
                  <li>Envía el comando completo antes de 10 minutos.</li>
                </ol>
              </div>
              <form action={generateTelegramCode}>
                <Button type="submit" size="sm" className="mt-5">
                  Generar un código nuevo
                </Button>
              </form>
              {linkCode && (
                <div className="mt-4 rounded-xl bg-(--canvas) p-4 text-center">
                  <p className="text-xs font-bold text-(--muted)">Copia y envía exactamente este mensaje</p>
                  <code className="mt-2 block text-lg font-black">/vincular {linkCode.code}</code>
                </div>
              )}
            </>
          )}
        </section>

        <section className="card border-[#c23b3b]/40 p-6 lg:col-span-2">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[#f7d9d9]">
              <AlertTriangle size={20} className="text-[#c23b3b]" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-[#c23b3b]">Zona de peligro</p>
              <h2 className="font-black">Salir del hogar o borrar tu cuenta</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="border-t border-black/10 pt-5 md:border-t-0 md:pt-0">
              <h3 className="font-black">Abandonar la pareja</h3>
              <p className="mt-1 text-sm text-(--muted)">
                Sales de {household.name} sin borrar tu cuenta: conservas tu acceso y tu nombre, pero dejas de ver este
                hogar y quedas libre para crear u unirte a otro. Tus cuentas y movimientos personales de este hogar se
                eliminan; lo que hayas registrado como compartido queda en el hogar, sin tu nombre.
              </p>
              <TypeToConfirm action={leaveHousehold} phrase="ABANDONAR" buttonLabel="Abandonar la pareja" />
            </div>

            <div className="border-t border-black/10 pt-5">
              <h3 className="font-black">Eliminar mi cuenta</h3>
              <p className="mt-1 text-sm text-(--muted)">Esta acción no se puede deshacer. Al confirmar:</p>
              <ul className="mt-2 space-y-1 text-sm text-(--muted)">
                <li>• Se borra tu cuenta y ya no podrás iniciar sesión.</li>
                <li>• Tus cuentas, movimientos y chat con el asistente personales se eliminan.</li>
                <li>• Lo que hayas registrado como compartido se conserva, mostrando &ldquo;Miembro eliminado&rdquo;.</li>
                <li>• Tu Telegram vinculado se desvincula.</li>
                <li>• Si eras la única persona del hogar, el hogar se elimina por completo.</li>
              </ul>
              <TypeToConfirm action={deleteAccount} phrase="ELIMINAR MI CUENTA" buttonLabel="Eliminar mi cuenta" />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
