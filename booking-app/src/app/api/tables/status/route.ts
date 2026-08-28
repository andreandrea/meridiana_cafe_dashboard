import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  computeSlotEnd,
  isSlotWithinOpeningHours,
  isWithinBookingWindow,
} from "@/lib/booking-rules";
import { romeWallTimeToUtc } from "@/lib/timezone";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date");
  const time = searchParams.get("time");
  const partySize = Number(searchParams.get("party_size") ?? "0");

  if (!date || !time || !partySize) {
    return NextResponse.json(
      { error: "Parametri mancanti (date, time, party_size)" },
      { status: 400 }
    );
  }

  const startAt = romeWallTimeToUtc(date, time);
  if (Number.isNaN(startAt.getTime())) {
    return NextResponse.json({ error: "Data/ora non valida" }, { status: 400 });
  }

  const db = createSupabaseServiceRoleClient();

  const [settingsRes, hoursRes, closuresRes] = await Promise.all([
    db.from("booking_settings").select("*").eq("id", 1).single(),
    db.from("opening_hours").select("*"),
    db.from("special_closures").select("*"),
  ]);

  const { data: settings } = settingsRes;
  const { data: hours } = hoursRes;
  const { data: closures } = closuresRes;

  if (!settings) {
    console.error("booking_settings query failed:", settingsRes.error);
    return NextResponse.json(
      { error: "Configurazione prenotazioni mancante" },
      { status: 500 }
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

  const { data: tables, error: tablesError } = await db
    .from("tables")
    .select("id, label, seats_min, seats_max, pos_x, pos_y, shape")
    .eq("is_active", true)
    .order("sort_order");

  if (tablesError) {
    return NextResponse.json({ error: tablesError.message }, { status: 500 });
  }

  const { data: overlapping, error: overlapError } = await db
    .from("bookings")
    .select("table_id")
    .in("status", ["pending", "confirmed"])
    .lt("start_at", endAt.toISOString())
    .gt("end_at", startAt.toISOString());

  if (overlapError) {
    return NextResponse.json({ error: overlapError.message }, { status: 500 });
  }

  const occupiedTableIds = new Set((overlapping ?? []).map((b) => b.table_id));

  const result = (tables ?? []).map((t) => ({
    ...t,
    is_occupied: occupiedTableIds.has(t.id),
    is_compatible: partySize >= t.seats_min && partySize <= t.seats_max,
  }));

  return NextResponse.json({
    tables: result,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
  });
}
