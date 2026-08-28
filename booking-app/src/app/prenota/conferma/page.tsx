import Link from "next/link";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

async function getBooking(id: string) {
  const db = createSupabaseServiceRoleClient();
  const { data: booking } = await db
    .from("bookings")
    .select("id, party_size, start_at, customer_name, tables(label)")
    .eq("id", id)
    .maybeSingle();

  const { data: settings } = await db
    .from("booking_settings")
    .select("restaurant_whatsapp_number, restaurant_name")
    .eq("id", 1)
    .single();

  return { booking, settings };
}

export default async function PrenotaConfermaPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  if (!id) {
    return (
      <div className="brand-gradient-bg flex flex-1 items-center justify-center px-6 py-24">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            Richiesta non trovata.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { booking, settings } = await getBooking(id);

  if (!booking) {
    return (
      <div className="brand-gradient-bg flex flex-1 items-center justify-center px-6 py-24">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            Richiesta non trovata.
          </CardContent>
        </Card>
      </div>
    );
  }

  const formattedDate = new Date(booking.start_at).toLocaleString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const tableLabel = (booking.tables as unknown as { label: string } | null)?.label ?? "";
  const restaurantName = settings?.restaurant_name ?? "Meridiana Cafè";
  const whatsappNumber = settings?.restaurant_whatsapp_number?.replace(/[^\d]/g, "");

  const whatsappText = encodeURIComponent(
    `Ciao! Ho appena inviato una richiesta di prenotazione su ${restaurantName}: ${booking.customer_name}, ${booking.party_size} persone, ${formattedDate}, ${tableLabel}. Potete confermarmela?`
  );

  return (
    <div className="brand-gradient-bg flex flex-1 items-center justify-center px-6 py-24">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col gap-4 pt-6">
          <h1 className="text-xl font-bold">Richiesta inviata!</h1>
          <p className="text-sm text-muted-foreground">
            La tua richiesta è in attesa di conferma da parte dello staff. Riepilogo:
          </p>
          <div className="rounded-md border p-4 text-sm">
            <p>
              <strong>{booking.customer_name}</strong>
            </p>
            <p>{formattedDate}</p>
            <p>
              {booking.party_size} persone · {tableLabel}
            </p>
          </div>

          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#25D366] px-6 text-sm font-bold text-white hover:opacity-90"
            >
              Contattaci su WhatsApp
            </a>
          )}

          <Link
            href="/"
            className="text-center text-sm text-muted-foreground underline"
          >
            Torna alla home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
