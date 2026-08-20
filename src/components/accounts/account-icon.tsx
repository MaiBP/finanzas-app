import Image from "next/image";
import { CreditCard, PiggyBank, TrendingUp, WalletCards } from "lucide-react";

// Types with dedicated artwork float overflowing the card's corner instead of sitting inside
// the lime badge (see AccountIcon for the "joint" fallback, the only type without one). Shared
// between the shared-accounts (Cuentas) and personal-accounts (Mi espacio personal) pages so
// both use the same artwork per account type.
export const FLOATING_ACCOUNT_IMAGES: Partial<Record<string, string>> = {
  bank: "/bank-building.png",
  cash: "/money-cash.png",
  card: "/credit-card.png",
  savings: "/piggy-bank.png",
  investment: "/investing.png",
};

export function AccountIcon({ type }: { type: string }) {
  if (type === "bank") return <Image src="/bank-building.png" alt="" width={32} height={32} className="size-6 object-contain" />;
  if (type === "cash") return <Image src="/money-cash.png" alt="" width={32} height={32} className="size-6 object-contain" />;
  if (type === "card") return <CreditCard />;
  if (type === "savings") return <PiggyBank />;
  if (type === "investment") return <TrendingUp />;
  return <WalletCards />;
}
