"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { motion } from "framer-motion";
import { askAssistant, type AssistantState } from "@/app/(dashboard)/app/asistente/actions";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";

export function AssistantForm() {
  const [state, action, pending] = useActionState(askAssistant, {} as AssistantState);
  return (
    <>
      <form action={action} className="mt-6 flex gap-2">
        <input className="field" name="message" required placeholder="¿Cuánto gastamos juntos y cuánto gasté yo?" />
        <Button type="submit" disabled={pending} size="icon" aria-label="Preguntar">
          <Send size={18} />
        </Button>
      </form>
      {state.reply && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-5 rounded-2xl bg-(--blue) p-4 text-sm leading-6"
        >
          {state.reply}
        </motion.div>
      )}
      <Banner kind="error">{state.error}</Banner>
    </>
  );
}
