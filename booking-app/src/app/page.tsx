import Link from "next/link";

export default function Home() {
  return (
    <div className="brand-gradient-bg flex flex-1 items-center justify-center px-6 py-24">
      <div className="brand-glass w-full max-w-md rounded-2xl p-10 text-center text-white shadow-xl">
        <p className="text-sm font-bold tracking-[3px] uppercase opacity-90">
          Meridiana Cafè
        </p>
        <h1 className="mt-4 text-3xl font-bold leading-tight">
          Prenota il tuo tavolo
        </h1>
        <p className="mt-3 text-sm opacity-90">
          Scegli data, orario e tavolo direttamente dalla mappa della sala.
        </p>
        <Link
          href="/prenota"
          className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--brand-gold)] px-6 text-sm font-bold tracking-wide text-[#333] transition-opacity hover:opacity-90"
        >
          PRENOTA ORA
        </Link>
      </div>
    </div>
  );
}
