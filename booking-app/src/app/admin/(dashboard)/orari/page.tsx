import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  updateBookingSettingsAction,
  upsertOpeningHourAction,
  deleteOpeningHourAction,
  createSpecialClosureAction,
  deleteSpecialClosureAction,
} from "./actions";

export const dynamic = "force-dynamic";

const DAY_LABELS = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
];

async function getData() {
  const db = createSupabaseServiceRoleClient();
  const [{ data: settings }, { data: hours }, { data: closures }] =
    await Promise.all([
      db.from("booking_settings").select("*").eq("id", 1).single(),
      db
        .from("opening_hours")
        .select("*")
        .order("day_of_week")
        .order("open_time"),
      db.from("special_closures").select("*").order("date_start"),
    ]);

  return {
    settings,
    hours: hours ?? [],
    closures: closures ?? [],
  };
}

export default async function OrariPage() {
  const { settings, hours, closures } = await getData();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Orari e regole di prenotazione</h1>

      <Card>
        <CardHeader>
          <CardTitle>Regole di prenotazione</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateBookingSettingsAction} className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="restaurant_name">Nome locale</Label>
              <Input
                id="restaurant_name"
                name="restaurant_name"
                defaultValue={settings?.restaurant_name ?? ""}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="restaurant_whatsapp_number">
                Numero WhatsApp (es. +393331234567)
              </Label>
              <Input
                id="restaurant_whatsapp_number"
                name="restaurant_whatsapp_number"
                defaultValue={settings?.restaurant_whatsapp_number ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="form_open_time">Apertura form ogni giorno</Label>
              <Input
                id="form_open_time"
                name="form_open_time"
                type="time"
                defaultValue={settings?.form_open_time?.slice(0, 5) ?? "06:00"}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="min_advance_minutes">Anticipo minimo (minuti)</Label>
              <Input
                id="min_advance_minutes"
                name="min_advance_minutes"
                type="number"
                min={0}
                defaultValue={settings?.min_advance_minutes ?? 30}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="max_advance_days">Anticipo massimo (giorni)</Label>
              <Input
                id="max_advance_days"
                name="max_advance_days"
                type="number"
                min={1}
                defaultValue={settings?.max_advance_days ?? 30}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="slot_duration_minutes">Durata occupazione tavolo (minuti)</Label>
              <Input
                id="slot_duration_minutes"
                name="slot_duration_minutes"
                type="number"
                min={15}
                defaultValue={settings?.slot_duration_minutes ?? 90}
                required
              />
            </div>
            <Button type="submit" className="col-span-2 w-fit">
              Salva regole
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orari settimanali</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {hours.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nessun turno configurato ancora.
              </p>
            )}
            {hours.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>
                  <strong>{DAY_LABELS[h.day_of_week]}</strong> · {h.shift_label} ·{" "}
                  {h.is_closed ? (
                    <Badge variant="secondary">Chiuso</Badge>
                  ) : (
                    `${h.open_time.slice(0, 5)}–${h.close_time.slice(0, 5)}`
                  )}
                </span>
                <form action={deleteOpeningHourAction.bind(null, h.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    Rimuovi
                  </Button>
                </form>
              </div>
            ))}
          </div>

          <form
            action={upsertOpeningHourAction}
            className="grid grid-cols-5 items-end gap-2 border-t pt-4"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="day_of_week" className="text-xs">
                Giorno
              </Label>
              <select
                id="day_of_week"
                name="day_of_week"
                className="h-9 rounded-md border bg-transparent px-2 text-sm"
                required
              >
                {DAY_LABELS.map((label, i) => (
                  <option key={i} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="shift_label" className="text-xs">
                Turno
              </Label>
              <Input
                id="shift_label"
                name="shift_label"
                placeholder="pranzo"
                defaultValue="pranzo"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="open_time" className="text-xs">
                Apertura
              </Label>
              <Input id="open_time" name="open_time" type="time" required />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="close_time" className="text-xs">
                Chiusura
              </Label>
              <Input id="close_time" name="close_time" type="time" required />
            </div>
            <Button type="submit" size="sm">
              Aggiungi turno
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chiusure straordinarie</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {closures.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nessuna chiusura straordinaria programmata.
              </p>
            )}
            {closures.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>
                  {c.date_start === c.date_end
                    ? c.date_start
                    : `${c.date_start} → ${c.date_end}`}
                  {c.reason ? ` · ${c.reason}` : ""}
                  {!c.all_day && c.closed_from && c.closed_to
                    ? ` · ${c.closed_from.slice(0, 5)}–${c.closed_to.slice(0, 5)}`
                    : ""}
                </span>
                <form action={deleteSpecialClosureAction.bind(null, c.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    Rimuovi
                  </Button>
                </form>
              </div>
            ))}
          </div>

          <form
            action={createSpecialClosureAction}
            className="grid grid-cols-3 items-end gap-2 border-t pt-4"
          >
            <input type="hidden" name="all_day" value="on" />
            <div className="flex flex-col gap-1">
              <Label htmlFor="date_start" className="text-xs">
                Da
              </Label>
              <Input id="date_start" name="date_start" type="date" required />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="date_end" className="text-xs">
                A (opzionale)
              </Label>
              <Input id="date_end" name="date_end" type="date" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="reason" className="text-xs">
                Motivo (opzionale)
              </Label>
              <Input id="reason" name="reason" placeholder="Ferie" />
            </div>
            <Button type="submit" size="sm" className="col-span-3 w-fit">
              Aggiungi chiusura
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
