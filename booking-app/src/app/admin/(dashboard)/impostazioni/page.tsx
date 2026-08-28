import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  addTelegramRecipientAction,
  deleteTelegramRecipientAction,
  toggleTelegramRecipientAction,
} from "./actions";

export const dynamic = "force-dynamic";

async function getRecipients() {
  const db = createSupabaseServiceRoleClient();
  const { data } = await db
    .from("telegram_recipients")
    .select("*")
    .order("created_at");
  return data ?? [];
}

export default async function ImpostazioniPage() {
  const recipients = await getRecipients();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Impostazioni</h1>

      <Card>
        <CardHeader>
          <CardTitle>Destinatari Telegram</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Il bot invia un messaggio a ogni destinatario attivo quando arriva una
            nuova richiesta di prenotazione. Per ottenere il Chat ID: scrivi{" "}
            <code>/start</code> al bot, poi apri{" "}
            <code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> e
            copia il valore <code>chat.id</code>.
          </p>

          <div className="flex flex-col gap-2">
            {recipients.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nessun destinatario configurato ancora.
              </p>
            )}
            {recipients.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  {r.label || "Senza nome"} · <code>{r.chat_id}</code>
                  <Badge variant={r.is_active ? "default" : "secondary"}>
                    {r.is_active ? "Attivo" : "Disattivo"}
                  </Badge>
                </span>
                <div className="flex gap-2">
                  <form
                    action={toggleTelegramRecipientAction.bind(
                      null,
                      r.id,
                      !r.is_active
                    )}
                  >
                    <Button type="submit" variant="outline" size="sm">
                      {r.is_active ? "Disattiva" : "Attiva"}
                    </Button>
                  </form>
                  <form action={deleteTelegramRecipientAction.bind(null, r.id)}>
                    <Button type="submit" variant="ghost" size="sm">
                      Rimuovi
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>

          <form
            action={addTelegramRecipientAction}
            className="grid grid-cols-3 items-end gap-2 border-t pt-4"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="chat_id" className="text-xs">
                Chat ID
              </Label>
              <Input id="chat_id" name="chat_id" required />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="label" className="text-xs">
                Nome (opzionale)
              </Label>
              <Input id="label" name="label" placeholder="Andrea" />
            </div>
            <Button type="submit" size="sm">
              Aggiungi destinatario
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
