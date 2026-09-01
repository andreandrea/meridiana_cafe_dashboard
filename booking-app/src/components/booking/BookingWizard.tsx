"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RoomMap, type RoomMapTable } from "@/components/room-map/RoomMap";
import {
  addDaysToDateStr,
  romeWallTimeToUtc,
  utcToRomeParts,
  weekdayOfDateStr,
} from "@/lib/timezone";
import {
  generateShiftSlots,
  type BookingSettings,
  type OpeningHour,
} from "@/lib/booking-rules";

type MenuItem = { id: string; category: string; name: string };

type OpeningData = {
  settings: BookingSettings;
  hours: OpeningHour[];
};

const CATEGORY_LABELS: Record<string, string> = {
  primo: "Primi Piatti",
  secondo: "Secondi",
  zuppa: "Zuppe",
  insalata: "Insalate",
  altro: "Altro",
};

function todayISO() {
  return utcToRomeParts(new Date()).dateStr;
}

function shiftLabel(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function BookingWizard() {
  const router = useRouter();

  const [date, setDate] = useState(todayISO());
  const [partySize, setPartySize] = useState(2);
  const [time, setTime] = useState<string | null>(null);

  const [openingData, setOpeningData] = useState<OpeningData | null>(null);
  const [loadingOpening, setLoadingOpening] = useState(true);

  const [tables, setTables] = useState<RoomMapTable[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/opening-hours")
      .then((r) => r.json())
      .then((data) => {
        setOpeningData({ settings: data.settings, hours: data.hours ?? [] });
        setLoadingOpening(false);
      })
      .catch(() => setLoadingOpening(false));
  }, []);

  // Ogni volta che data/ora/persone cambiano, ricarica automaticamente
  // la disponibilità della mappa — nessun pulsante "Cerca" separato.
  useEffect(() => {
    if (!time) return;

    let cancelled = false;

    async function loadAvailability() {
      setError(null);
      setSelectedTableId(null);
      setLoadingTables(true);

      try {
        const [statusRes, menuRes] = await Promise.all([
          fetch(
            `/api/tables/status?date=${date}&time=${time}&party_size=${partySize}`
          ),
          fetch(`/api/menu/daily?date=${date}`),
        ]);
        if (cancelled) return;

        const statusData = await statusRes.json();
        if (!statusRes.ok) {
          setError(statusData.error ?? "Errore nel controllo disponibilità");
          setTables([]);
          return;
        }

        const menuData = await menuRes.json();
        if (cancelled) return;
        setTables(statusData.tables);
        setMenuItems(menuData.items ?? []);
      } catch {
        if (!cancelled) setError("Errore di rete. Riprova.");
      } finally {
        if (!cancelled) setLoadingTables(false);
      }
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [date, time, partySize]);

  const maxDate = openingData
    ? addDaysToDateStr(todayISO(), openingData.settings.max_advance_days)
    : undefined;

  const shiftsForDate = useMemo(() => {
    if (!openingData) return [];
    const weekday = weekdayOfDateStr(date);
    return openingData.hours.filter(
      (h) =>
        h.day_of_week === weekday &&
        !h.is_closed &&
        // Le prenotazioni online valgono solo per il turno pranzo per
        // ora: la cena resta gestita come oggi (telefono/WhatsApp).
        h.shift_label.toLowerCase().includes("pranzo")
    );
  }, [openingData, date]);

  const slotsByShift = useMemo(() => {
    if (!openingData) return {} as Record<string, string[]>;
    const now = new Date();
    const map: Record<string, string[]> = {};
    for (const shift of shiftsForDate) {
      map[shift.shift_label] = generateShiftSlots(
        date,
        shift,
        openingData.settings,
        now
      );
    }
    return map;
  }, [shiftsForDate, openingData, date]);

  function handleSelectDate(value: string) {
    setDate(value);
    setTime(null);
  }

  function handleChangePartySize(value: number) {
    setPartySize(value);
    setSelectedTableId(null);
  }

  async function handleSubmitBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTableId || !time) return;
    setError(null);
    setSubmitting(true);

    try {
      const startAt = romeWallTimeToUtc(date, time).toISOString();
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: selectedTableId,
          party_size: partySize,
          customer_name: name,
          customer_phone: phone,
          start_at: startAt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Errore nell'invio della richiesta");
        if (res.status === 409) {
          setSelectedTableId(null);
        }
        setSubmitting(false);
        return;
      }

      router.push(`/prenota/conferma?id=${data.booking.id}`);
    } catch {
      setError("Errore di rete. Riprova.");
      setSubmitting(false);
    }
  }

  const groupedMenu = menuItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                min={todayISO()}
                max={maxDate}
                value={date}
                onChange={(e) => handleSelectDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="party_size">Persone</Label>
              <Input
                id="party_size"
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={(e) => handleChangePartySize(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Turno e orario</Label>
            {loadingOpening && (
              <p className="text-sm text-muted-foreground">
                Caricamento orari...
              </p>
            )}
            {!loadingOpening && shiftsForDate.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Il locale è chiuso in questa data.
              </p>
            )}
            {!loadingOpening && shiftsForDate.length > 0 && (
              <Accordion type="single" collapsible defaultValue={shiftsForDate[0]?.shift_label}>
                {shiftsForDate.map((shift) => {
                  const slots = slotsByShift[shift.shift_label] ?? [];
                  return (
                    <AccordionItem key={shift.shift_label} value={shift.shift_label}>
                      <AccordionTrigger>
                        {shiftLabel(shift.shift_label)} · {shift.open_time.slice(0, 5)}–
                        {shift.close_time.slice(0, 5)}
                      </AccordionTrigger>
                      <AccordionContent>
                        {slots.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Nessun orario disponibile per questo turno.
                          </p>
                        ) : (
                          <div className="grid grid-cols-4 gap-2">
                            {slots.map((slot) => (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setTime(slot)}
                                className={`rounded-md border px-2 py-1.5 text-sm transition-colors ${
                                  time === slot
                                    ? "border-primary bg-primary/10 font-semibold"
                                    : "hover:bg-accent"
                                }`}
                              >
                                {slot}
                              </button>
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </div>
        </CardContent>
      </Card>

      {time && (
        <div className="flex flex-col gap-4">
          {Object.keys(groupedMenu).length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Menu del giorno
                </p>
                {Object.entries(groupedMenu).map(([category, items]) => (
                  <div key={category} className="mb-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {CATEGORY_LABELS[category] ?? category}
                    </p>
                    <ul className="text-sm">
                      {items.map((item) => (
                        <li key={item.id}>{item.name}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              Clicca un tavolo libero sulla mappa per prenotarlo
            </p>
            {loadingTables ? (
              <p className="text-sm text-muted-foreground">
                Verifica disponibilità...
              </p>
            ) : (
              <RoomMap
                tables={tables}
                selectedTableId={selectedTableId}
                onSelectTable={setSelectedTableId}
              />
            )}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full bg-white/85" /> Libero
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full bg-[var(--brand-gold)]" /> Selezionato
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full bg-gray-500" /> Occupato
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full bg-white/20" /> Non adatto al gruppo
              </span>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      {selectedTable && (
        <Card>
          <CardContent className="pt-6">
            <p className="mb-4 text-sm font-medium">
              Stai prenotando <strong>{selectedTable.label}</strong> per {partySize}{" "}
              persone, {date} alle {time}
            </p>
            <form onSubmit={handleSubmitBooking} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nome e cognome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Numero di telefono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+39 333 1234567"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={submitting}>
                {submitting ? "Invio in corso..." : "Invia richiesta"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
