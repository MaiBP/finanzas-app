"use client";
import { useActionState } from "react";
import { Send } from "lucide-react";
import { askAssistant,type AssistantState } from "@/app/(dashboard)/app/asistente/actions";
export function AssistantForm(){const [state,action,pending]=useActionState(askAssistant,{} as AssistantState);return <><form action={action} className="mt-6 flex gap-2"><input className="field" name="message" required placeholder="¿Cuánto gastamos este mes?"/><button disabled={pending} className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#26725c] text-white disabled:opacity-60"><Send size={18}/></button></form>{state.reply&&<div className="mt-5 rounded-2xl bg-[#73c8dc] p-4 text-sm leading-6">{state.reply}</div>}{state.error&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}</>}
