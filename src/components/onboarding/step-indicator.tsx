export function StepIndicator({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="mx-auto mb-5 flex w-fit flex-col items-center gap-2">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 rounded-full transition-all ${index < step ? "w-6 bg-(--ink)" : "w-1.5 bg-(--ink)/20"}`}
          />
        ))}
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-(--muted)">
        Paso {step} de {total} · {label}
      </p>
    </div>
  );
}
