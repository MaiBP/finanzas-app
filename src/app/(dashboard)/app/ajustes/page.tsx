import { Copy, Home, Send, UserRound } from "lucide-react";
import { getCurrentHousehold } from "@/lib/household";
import { generateTelegramCode, updateHouseholdName, updatePersonalSpaceName } from "./actions";

export default async function SettingsPage(){
  const {supabase,user,household}=await getCurrentHousehold();if(!household)return null;
  const [{data:invite},{data:link},{data:linkCode},{data:profile}]=await Promise.all([
    household.role==="owner"?supabase.from("household_invites").select("code,expires_at").eq("household_id",household.id).is("used_at",null).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(1).maybeSingle():Promise.resolve({data:null}),
    supabase.from("telegram_links").select("linked_at").eq("user_id",user.id).maybeSingle(),
    supabase.from("telegram_link_codes").select("code,expires_at").eq("user_id",user.id).is("used_at",null).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(1).maybeSingle(),
    supabase.from("profiles").select("personal_space_name").eq("id",user.id).maybeSingle(),
  ]);
  const personalSpaceName=profile?.personal_space_name??"Mi espacio";

  return <><p className="text-sm font-bold uppercase">Configuración general</p><h1 className="mt-1 text-3xl font-black">Ajustes</h1><p className="mt-2 max-w-2xl text-[#6c7f7a]">Administra por separado el espacio del hogar, tu módulo personal y las conexiones que funcionan en toda la aplicación.</p>
    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      <section className="card p-6"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#e19bf5]"><Home size={20}/></span><div><p className="text-xs font-bold uppercase text-[#6c7f7a]">Espacio compartido</p><h2 className="font-black">Hogar · {household.name}</h2></div></div>{household.role==="owner"?<form action={updateHouseholdName} className="mt-5"><label><span className="label">Nombre del hogar</span><input className="field" name="name" defaultValue={household.name} required minLength={2} maxLength={80}/></label><button className="mt-3 rounded-xl px-5 py-3 font-bold">Guardar nombre</button></form>:<p className="mt-5 text-sm text-[#6c7f7a]">Solo la persona propietaria puede cambiar el nombre del hogar.</p>}<div className="mt-6 border-t border-black/10 pt-5"><h3 className="font-black">Invitar al hogar</h3><p className="mt-1 text-sm text-[#6c7f7a]">Comparte este código con tu pareja. Caduca automáticamente.</p>{household.role==="owner"?<div className="mt-4 flex items-center justify-between rounded-xl bg-[#f6f4ec] p-4"><code className="text-xl font-black tracking-[.2em]">{invite?.code??"SIN CÓDIGO"}</code><Copy size={18}/></div>:<p className="mt-4 text-sm">La invitación la administra la persona propietaria.</p>}</div></section>

      <section className="card p-6"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#87cd64]"><UserRound size={20}/></span><div><p className="text-xs font-bold uppercase text-[#6c7f7a]">Espacio privado</p><h2 className="font-black">Personal · {personalSpaceName}</h2></div></div><form action={updatePersonalSpaceName} className="mt-5"><label><span className="label">Nombre de tu espacio personal</span><input className="field" name="name" defaultValue={personalSpaceName} required minLength={2} maxLength={50} placeholder="Mis finanzas"/></label><button className="mt-3 rounded-xl px-5 py-3 font-bold">Guardar nombre</button></form><p className="mt-5 rounded-xl bg-[#87cd64]/25 p-4 text-sm">Este nombre solo organiza tu experiencia. Las cuentas y movimientos personales continúan siendo privados para ti.</p></section>

      <section className="card p-6 lg:col-span-2"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#73c8dc]"><Send size={20}/></span><div><p className="text-xs font-bold uppercase text-[#6c7f7a]">Herramienta general</p><h2 className="font-black">Telegram</h2><p className="text-sm text-[#6c7f7a]">{link?"Vinculado":"No vinculado"}</p></div></div>{link?<p className="mt-5 rounded-xl bg-[#73c8dc]/25 p-4 text-sm">El bot puede consultar el hogar y tu espacio personal, registrar movimientos en el ámbito indicado y responder a <code>/resumen</code> y <code>/ultimos</code>.</p>:<><form action={generateTelegramCode}><button className="mt-6 rounded-xl px-5 py-3 font-bold">Generar código de vinculación</button></form>{linkCode&&<div className="mt-4 rounded-xl bg-[#f6f4ec] p-4 text-center"><p className="text-xs text-[#6c7f7a]">Envía al bot antes de 10 minutos</p><code className="mt-2 block text-lg font-black">/vincular {linkCode.code}</code></div>}</>}</section>
    </div>
  </>;
}
