import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { createBookingSchema } from "@/lib/validations/booking-schema";
import {
  computeSlotEnd,
  isSlotWithinOpeningHours,
  isWithinBookingWindow,
} from "@/lib/booking-rules";
import { sendTelegramMessage, formatBookingAlert } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createBookingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  const { table_id, party_size, customer_name, customer_phone, start_at } =
    parsed.data;
  const startAt = new Date(start_at);
  const db = createSupabaseServiceRoleClient();

  const [{ data: settings }, { data: hours }, { data: closures }, { data: table }] =
    await Promise.all([
      db.from("booking_settings").select("*").eq("id", 1).single(),
      db.from("opening_hours").select("*"),
      db.from("special_closures").select("*"),
      db.from("tables").select("*").eq("id", table_id).eq("is_active", true).maybeSingle(),
    ]);

  if (!settings) {
    return NextResponse.json(
      { error: "Configurazione prenotazioni mancante" },
      { status: 500 }
    );
  }

  if (!table) {
    return NextResponse.json({ error: "Tavolo non trovato" }, { status: 404 });
  }

  if (party_size < table.seats_min || party_size > table.seats_max) {
    return NextResponse.json(
      { error: "Numero di persone non compatibile con questo tavolo" },
      { status: 400 }
    );
  }

  const windowCheck = isWithinBookingWindow(new Date(), startAt, settings);
  if (!windowCheck.allowed) {
    return NextResponse.json({ error: windowCheck.reason }, { status: 400 });
  }

  const endAt = computeSlotEnd(startAt, settings);

  const hoursCheck = isSlotWithinOpeningHours(
    startAt,
    endAt,
    hours ?? [],
    closures ?? []
  );
  if (!hoursCheck.allowed) {
    return NextResponse.json({ error: hoursCheck.reason }, { status: 400 });
  }

  const { data: booking, error } = await db
    .from("bookings")
    .insert({
      table_id,
      party_size,
      customer_name,
      customer_phone,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: "pending",
      source: "web",
    })
    .select()
    .single();

  if (error) {
    // 23P01 = exclusion_violation: un'altra prenotazione ha già
    // occupato questo tavolo/slot nel frattempo.
    if (error.code === "23P01") {
      return NextResponse.json(
        { error: "Questo tavolo non è più disponibile per l'orario scelto." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Alert Telegram allo staff — best-effort: se fallisce (bot non
  // ancora configurato) non blocca la creazione della prenotazione.
  try {
    const { data: recipients } = await db
      .from("telegram_recipients")
      .select("chat_id")
      .eq("is_active", true);

    if (recipients && recipients.length > 0 && process.env.TELEGRAM_BOT_TOKEN) {
      const text = formatBookingAlert({
        customer_name,
        customer_phone,
        party_size,
        table_label: table.label,
        start_at: booking.start_at,
      });
      await Promise.all(
        recipients.map((r) => sendTelegramMessage(r.chat_id, text))
      );
    }
  } catch (err) {
    console.error("Errore invio notifica Telegram:", err);
  }

  return NextResponse.json({
    booking: {
      id: booking.id,
      table_label: table.label,
      party_size: booking.party_size,
      start_at: booking.start_at,
      customer_name: booking.customer_name,
    },
    restaurant_whatsapp_number: settings.restaurant_whatsapp_number,
    restaurant_name: settings.restaurant_name,
  });
}
