import Link from "next/link";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { PlaceholderImage } from "@/components/marketing/PlaceholderImage";
import { utcToRomeParts } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

const CATEGORY_LABELS: Record<string, string> = {
  primo: "Primi Piatti",
  secondo: "Secondi",
  zuppa: "Zuppe",
  insalata: "Insalate",
  altro: "Altro",
};

async function getHomeData() {
  const db = createSupabaseServiceRoleClient();
  const todayStr = utcToRomeParts(new Date()).dateStr;

  const [{ data: hours }, { data: menu }] = await Promise.all([
    db
      .from("opening_hours")
      .select("day_of_week, shift_label, open_time, close_time, is_closed")
      .order("day_of_week")
      .order("open_time"),
    db
      .from("daily_menus")
      .select("id")
      .eq("menu_date", todayStr)
      .eq("is_published", true)
      .maybeSingle(),
  ]);

  let menuItems: { category: string; name: string }[] = [];
  if (menu) {
    const { data: items } = await db
      .from("menu_items")
      .select("category, name")
      .eq("daily_menu_id", menu.id)
      .eq("is_available", true)
      .order("category")
      .order("sort_order")
      .limit(6);
    menuItems = items ?? [];
  }

  const hoursByDay = new Map<number, { shift_label: string; open_time: string; close_time: string }[]>();
  for (const h of hours ?? []) {
    if (h.is_closed) continue;
    const list = hoursByDay.get(h.day_of_week) ?? [];
    list.push(h);
    hoursByDay.set(h.day_of_week, list);
  }

  return { hoursByDay, menuItems };
}

export default async function Home() {
  const { hoursByDay, menuItems } = await getHomeData();

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="brand-gradient-bg flex items-center justify-between px-6 py-4 text-white sm:px-12">
        <span className="text-sm font-bold uppercase tracking-[3px]">
          Meridiana Cafè
        </span>
        <Link
          href="/prenota"
          className="inline-flex h-9 items-center justify-center rounded-full bg-[var(--brand-gold)] px-5 text-xs font-bold tracking-wide text-[#333] transition-opacity hover:opacity-90"
        >
          PRENOTA
        </Link>
      </header>

      {/* Hero */}
      <section className="brand-gradient-bg flex flex-col items-center px-6 pb-24 pt-16 text-center text-white sm:pb-32 sm:pt-24">
        <p className="text-xs font-bold uppercase tracking-[4px] opacity-80">
          Cucina di stagione, ogni giorno
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight sm:text-6xl">
          Meridiana Cafè
        </h1>
        <p className="mt-4 max-w-md text-sm opacity-90 sm:text-base">
          Un tavolo con vista sul mare, un menu che cambia ogni giorno.
          Prenota il pranzo direttamente online.
        </p>
        <Link
          href="/prenota"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[var(--brand-gold)] px-8 text-sm font-bold tracking-wide text-[#333] transition-opacity hover:opacity-90"
        >
          PRENOTA UN TAVOLO
        </Link>
      </section>

      {/* Chi siamo */}
      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-8 px-6 py-16 sm:grid-cols-2 sm:py-24">
        <PlaceholderImage
          variant="interior"
          label="foto locale"
          className="aspect-[4/3] w-full rounded-2xl"
        />
        <div>
          <p className="text-xs font-bold uppercase tracking-[3px] text-muted-foreground">
            Chi siamo
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            Un angolo di Mediterraneo
          </h2>
          <p className="mt-4 text-sm text-muted-foreground sm:text-base">
            Meridiana Cafè nasce dalla passione per gli ingredienti freschi e
            la cucina semplice, fatta bene. Ogni giorno un menu diverso,
            pensato per chi cerca una pausa pranzo di qualità.
          </p>
        </div>
      </section>

      {/* Menu del giorno */}
      <section className="brand-gradient-bg px-6 py-16 text-white sm:py-24">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-8 sm:grid-cols-2">
          <div className="order-2 sm:order-1">
            <p className="text-xs font-bold uppercase tracking-[3px] opacity-80">
              Il menu di oggi
            </p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              Sempre fresco, sempre diverso
            </h2>
            {menuItems.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-1 text-sm opacity-90">
                {menuItems.map((item, i) => (
                  <li key={i}>
                    <span className="opacity-70">
                      {CATEGORY_LABELS[item.category] ?? item.category}:
                    </span>{" "}
                    {item.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm opacity-90">
                Il menu di oggi viene aggiornato ogni mattina dal nostro
                staff — scoprilo prenotando un tavolo.
              </p>
            )}
            <Link
              href="/prenota"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[var(--brand-gold)] px-6 text-sm font-bold tracking-wide text-[#333] transition-opacity hover:opacity-90"
            >
              PRENOTA IL PRANZO
            </Link>
          </div>
          <PlaceholderImage
            variant="food"
            label="foto piatti"
            className="order-1 aspect-[4/3] w-full rounded-2xl sm:order-2"
          />
        </div>
      </section>

      {/* Orari e contatti */}
      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-8 px-6 py-16 sm:grid-cols-2 sm:py-24">
        <div>
          <p className="text-xs font-bold uppercase tracking-[3px] text-muted-foreground">
            Dove e quando
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Orari</h2>
          <dl className="mt-4 flex flex-col gap-1 text-sm">
            {DAY_LABELS.map((label, day) => {
              const shifts = hoursByDay.get(day);
              return (
                <div key={day} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right">
                    {!shifts || shifts.length === 0
                      ? "Chiuso"
                      : shifts
                          .map(
                            (s) =>
                              `${s.open_time.slice(0, 5)}–${s.close_time.slice(0, 5)}`
                          )
                          .join(" · ")}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
        <PlaceholderImage
          variant="location"
          label="mappa / posizione"
          className="aspect-[4/3] w-full rounded-2xl"
        />
      </section>

      {/* Footer */}
      <footer className="brand-gradient-bg mt-auto flex flex-col items-center gap-2 px-6 py-10 text-center text-white">
        <span className="text-sm font-bold uppercase tracking-[3px]">
          Meridiana Cafè
        </span>
        <p className="text-xs opacity-70">
          © {new Date().getFullYear()} Meridiana Cafè. Tutti i diritti riservati.
        </p>
      </footer>
    </div>
  );
}
