import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const db = createSupabaseServiceRoleClient();

  const [{ data: settings }, { data: hours }, { data: closures }] =
    await Promise.all([
      db.from("booking_settings").select("*").eq("id", 1).single(),
      db.from("opening_hours").select("*").order("day_of_week").order("open_time"),
      db.from("special_closures").select("*").order("date_start"),
    ]);

  return NextResponse.json({
    settings,
    hours: hours ?? [],
    closures: closures ?? [],
  });
}
