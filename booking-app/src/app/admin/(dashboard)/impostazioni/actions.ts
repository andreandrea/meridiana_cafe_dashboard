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

export async function addTelegramRecipientAction(formData: FormData) {
  await requireStaffUser();

  const chatId = String(formData.get("chat_id") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();

  if (!chatId) throw new Error("Chat ID obbligatorio");

  const db = createSupabaseServiceRoleClient();
  const { error } = await db
    .from("telegram_recipients")
    .insert({ chat_id: chatId, label: label || null });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/impostazioni");
}

export async function toggleTelegramRecipientAction(
  id: string,
  isActive: boolean
) {
  await requireStaffUser();
  const db = createSupabaseServiceRoleClient();
  const { error } = await db
    .from("telegram_recipients")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/impostazioni");
}

export async function deleteTelegramRecipientAction(id: string) {
  await requireStaffUser();
  const db = createSupabaseServiceRoleClient();
  const { error } = await db.from("telegram_recipients").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/impostazioni");
}
