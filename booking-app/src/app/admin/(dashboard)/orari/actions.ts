"use server";

import { revalidatePath } from "next/cache";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";
import {
  openingHourSchema,
  specialClosureSchema,
  bookingSettingsSchema,
} from "@/lib/validations/settings-schema";

async function requireStaffUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorizzato");
  return user;
}

export async function updateBookingSettingsAction(formData: FormData) {
  await requireStaffUser();

  const parsed = bookingSettingsSchema.safeParse({
    min_advance_minutes: Number(formData.get("min_advance_minutes")),
    form_open_time: String(formData.get("form_open_time")),
    max_advance_days: Number(formData.get("max_advance_days")),
    slot_duration_minutes: Number(formData.get("slot_duration_minutes")),
    restaurant_name: String(formData.get("restaurant_name")),
    restaurant_whatsapp_number: String(
      formData.get("restaurant_whatsapp_number") ?? ""
    ),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dati non validi");
  }

  const db = createSupabaseServiceRoleClient();
  const { error } = await db
    .from("booking_settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/orari");
}

export async function upsertOpeningHourAction(formData: FormData) {
  await requireStaffUser();

  const id = formData.get("id") ? String(formData.get("id")) : null;
  const parsed = openingHourSchema.safeParse({
    day_of_week: Number(formData.get("day_of_week")),
    shift_label: String(formData.get("shift_label")),
    open_time: String(formData.get("open_time")),
    close_time: String(formData.get("close_time")),
    is_closed: formData.get("is_closed") === "on",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dati non validi");
  }

  const db = createSupabaseServiceRoleClient();
  const { error } = id
    ? await db.from("opening_hours").update(parsed.data).eq("id", id)
    : await db.from("opening_hours").insert(parsed.data);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/orari");
}

export async function deleteOpeningHourAction(id: string) {
  await requireStaffUser();
  const db = createSupabaseServiceRoleClient();
  const { error } = await db.from("opening_hours").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/orari");
}

export async function createSpecialClosureAction(formData: FormData) {
  await requireStaffUser();

  const parsed = specialClosureSchema.safeParse({
    date_start: String(formData.get("date_start")),
    date_end: String(formData.get("date_end") || formData.get("date_start")),
    all_day: formData.get("all_day") === "on",
    closed_from: String(formData.get("closed_from") ?? ""),
    closed_to: String(formData.get("closed_to") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dati non validi");
  }

  const db = createSupabaseServiceRoleClient();
  const { error } = await db.from("special_closures").insert({
    date_start: parsed.data.date_start,
    date_end: parsed.data.date_end,
    all_day: parsed.data.all_day,
    closed_from: parsed.data.closed_from || null,
    closed_to: parsed.data.closed_to || null,
    reason: parsed.data.reason || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/orari");
}

export async function deleteSpecialClosureAction(id: string) {
  await requireStaffUser();
  const db = createSupabaseServiceRoleClient();
  const { error } = await db.from("special_closures").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/orari");
}
