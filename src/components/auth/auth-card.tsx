import Link from "next/link";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center px-5 py-10"><div className="w-full max-w-md"><Link href="/" className="mb-8 flex justify-center gap-2 text-lg font-black"><span className="grid size-9 place-items-center rounded-xl bg-[#26725c] text-white">a</span>A medias</Link><section className="card p-7 md:p-9"><h1 className="text-3xl font-black tracking-tight">{title}</h1><p className="mt-2 text-[#6c7f7a]">{subtitle}</p><div className="mt-7">{children}</div><div className="mt-6 text-center text-sm text-[#6c7f7a]">{footer}</div></section></div></main>;
}
