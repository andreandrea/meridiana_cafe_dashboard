import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Parametro date mancante" }, { status: 400 });
  }

  const db = createSupabaseServiceRoleClient();

  const { data: menu } = await db
    .from("daily_menus")
    .select("id, menu_date, notes")
    .eq("menu_date", date)
    .eq("is_published", true)
    .maybeSingle();

  if (!menu) {
    return NextResponse.json({ menu: null, items: [] });
  }

  const { data: items, error } = await db
    .from("menu_items")
    .select("id, category, name, sort_order")
    .eq("daily_menu_id", menu.id)
    .eq("is_available", true)
    .order("category")
    .order("sort_order");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ menu, items: items ?? [] });
}
