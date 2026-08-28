"use server";

import { revalidatePath } from "next/cache";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";

async function requireStaffUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autorizzato");
  return user;
}

async function decideBooking(
  bookingId: string,
  status: "confirmed" | "rejected"
) {
  const user = await requireStaffUser();
  const db = createSupabaseServiceRoleClient();

  const { data, error } = await db
    .from("bookings")
    .update({
      status,
      decision_channel: "admin_panel",
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/richieste");

  // Se null: la richiesta era già stata decisa da un altro canale
  // (es. Telegram) nel frattempo — non è un errore, va solo segnalato.
  return { alreadyDecided: !data };
}

export async function acceptBookingAction(bookingId: string) {
  return decideBooking(bookingId, "confirmed");
}

export async function rejectBookingAction(bookingId: string) {
  return decideBooking(bookingId, "rejected");
}
