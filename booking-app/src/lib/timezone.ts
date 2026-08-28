const RESTAURANT_TIMEZONE = "Europe/Rome";

/**
 * Offset UTC (in minuti) di Europe/Rome nell'istante indicato.
 * Gestisce automaticamente CET/CEST (cambio ora legale).
 */
function getRomeOffsetMinutes(instant: Date): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: RESTAURANT_TIMEZONE,
    timeZoneName: "shortOffset",
  })
    .formatToParts(instant)
    .find((part) => part.type === "timeZoneName")?.value;

  // formatted es. "GMT+2" o "GMT+1"
  const match = formatted?.match(/GMT([+-]\d+)/);
  const hours = match ? Number(match[1]) : 1;
  return hours * 60;
}

/**
 * Combina una data (YYYY-MM-DD) e un'ora (HH:MM) intese come orario
 * locale di Europe/Rome, restituendo l'istante UTC corrispondente.
 * Necessario perché il server (Vercel) gira in UTC: senza questa
 * conversione "20:00" inserito da un cliente verrebbe interpretato
 * come 20:00 UTC invece che 20:00 ora italiana.
 */
export function romeWallTimeToUtc(dateStr: string, timeStr: string): Date {
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  const offsetMinutes = getRomeOffsetMinutes(naiveUtc);
  return new Date(naiveUtc.getTime() - offsetMinutes * 60000);
}

export type RomeDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = domenica, come Date.getDay()
  dateStr: string; // YYYY-MM-DD
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Estrae i componenti calendario/ora locali di Europe/Rome da un
 * istante UTC (es. `new Date()` o `booking.start_at`).
 */
export function utcToRomeParts(instant: Date): RomeDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: RESTAURANT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(instant);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  // "24" alla mezzanotte va normalizzato a 0
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  const weekday = WEEKDAY_INDEX[get("weekday")] ?? 0;

  return {
    year,
    month,
    day,
    hour,
    minute,
    weekday,
    dateStr: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}
