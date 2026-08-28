"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

type TableStatus = {
  id: string;
  label: string;
  seats_min: number;
  seats_max: number;
  is_occupied: boolean;
  is_compatible: boolean;
};

type MenuItem = { id: string; category: string; name: string };

const CATEGORY_LABELS: Record<string, string> = {
  primo: "Primi Piatti",
  secondo: "Secondi",
  zuppa: "Zuppe",
  insalata: "Insalate",
  altro: "Altro",
};

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function BookingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [partySize, setPartySize] = useState(2);

  const [tables, setTables] = useState<TableStatus[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFindTables(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSelectedTableId(null);
    setLoading(true);

    try {
      const [statusRes, menuRes] = await Promise.all([
        fetch(
          `/api/tables/status?date=${date}&time=${time}&party_size=${partySize}`
        ),
        fetch(`/api/menu/daily?date=${date}`),
      ]);

      const statusData = await statusRes.json();
      if (!statusRes.ok) {
        setError(statusData.error ?? "Errore nel controllo disponibilità");
        setLoading(false);
        return;
      }

      const menuData = await menuRes.json();

      setTables(statusData.tables);
      setMenuItems(menuData.items ?? []);
      setStep(2);
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTableId) return;
    setError(null);
    setLoading(true);

    try {
      const startAt = new Date(`${date}T${time}:00`).toISOString();
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
          setStep(2);
        }
        setLoading(false);
        return;
      }

      router.push(`/prenota/conferma?id=${data.booking.id}`);
    } catch {
      setError("Errore di rete. Riprova.");
      setLoading(false);
    }
  }

  const groupedMenu = menuItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      {step === 1 && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleFindTables} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  min={todayISO()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="time">Ora</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="party_size">Numero di persone</Label>
                <Input
                  id="party_size"
                  type="number"
                  min={1}
                  max={20}
                  value={partySize}
                  onChange={(e) => setPartySize(Number(e.target.value))}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading}>
                {loading ? "Verifica disponibilità..." : "Cerca tavolo"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
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
            <p className="text-sm font-medium">Scegli un tavolo</p>
            {tables.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nessun tavolo configurato.
              </p>
            )}
            {tables.map((t) => {
              const disabled = t.is_occupied || !t.is_compatible;
              const selected = selectedTableId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelectedTableId(t.id)}
                  className={`flex items-center justify-between rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                    selected
                      ? "border-primary bg-primary/10"
                      : disabled
                        ? "cursor-not-allowed opacity-40"
                        : "hover:bg-accent"
                  }`}
                >
                  <span>
                    <strong>{t.label}</strong> · {t.seats_min}-{t.seats_max} persone
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t.is_occupied
                      ? "Occupato"
                      : !t.is_compatible
                        ? "Non adatto"
                        : selected
                          ? "Selezionato"
                          : "Libero"}
                  </span>
                </button>
              );
            })}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Indietro
            </Button>
            <Button
              type="button"
              disabled={!selectedTableId}
              onClick={() => setStep(3)}
              className="flex-1"
            >
              Continua
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <Card>
          <CardContent className="pt-6">
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
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                >
                  Indietro
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Invio in corso..." : "Invia richiesta"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
