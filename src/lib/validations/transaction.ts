import { z } from "zod";

export const transactionSchema = z.object({
  description: z.string().trim().min(2, "Describe el movimiento").max(160),
  amount: z.string().trim().min(1, "Indica el importe"),
  type: z.enum(["expense", "income"]),
  scope: z.enum(["personal", "shared"]),
  privacy: z.enum(["visible", "private"]),
  accountId: z.string().uuid("Selecciona una cuenta"),
  categoryId: z.string().uuid("Selecciona una categoría"),
  transactionDate: z.iso.date(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
