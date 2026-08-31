"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Send, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { askAssistant, type AssistantState } from "@/app/(dashboard)/app/asistente/actions";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";
import type { ConversationMessage } from "@/services/conversation-history";

export function AssistantForm({ initialMessages }: { initialMessages: ConversationMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [state, action, pending] = useActionState(askAssistant, {} as AssistantState);
  const formRef = useRef<HTMLFormElement>(null);
  const lastReply = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.reply && state.reply !== lastReply.current) {
      lastReply.current = state.reply;
      setMessages((previous) => [...previous, { role: "assistant", content: state.reply! }]);
    }
  }, [state.reply]);

  function handleSubmit(formData: FormData) {
    const text = String(formData.get("message") ?? "").trim();
    if (text) setMessages((previous) => [...previous, { role: "user", content: text }]);
    formRef.current?.reset();
    return action(formData);
  }

  return (
    <>
      <div className="mt-6 max-h-112 space-y-3 overflow-y-auto pr-1">
        {!messages.length && (
          <p className="py-8 text-center text-sm text-(--muted)">Preguntá algo para empezar la conversación.</p>
        )}
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`flex items-end gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-full ${message.role === "user" ? "bg-(--lime)" : "bg-white"}`}
            >
              {message.role === "user" ? (
                <UserRound size={16} />
              ) : (
                <Image src="/finzy-mascot.png" alt="Piggy" width={32} height={32} className="size-6 object-contain" />
              )}
            </span>
            <div
              className={`max-w-[80%] whitespace-pre-line rounded-2xl p-3 text-sm leading-6 ${message.role === "user" ? "bg-(--highlight)" : "bg-(--blue)"}`}
            >
              {message.content}
            </div>
          </motion.div>
        ))}
      </div>
      <form ref={formRef} action={handleSubmit} className="mt-4 flex gap-2">
        <input
          className="field"
          name="message"
          required
          autoComplete="off"
          placeholder="¿Cuánto gastamos juntos y cuánto gasté yo?"
        />
        <Button type="submit" disabled={pending} size="icon" aria-label="Preguntar">
          <Send size={18} />
        </Button>
      </form>
      <Banner kind="error">{state.error}</Banner>
    </>
  );
}
