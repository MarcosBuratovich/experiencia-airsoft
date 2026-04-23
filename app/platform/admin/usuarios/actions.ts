"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setSocioAction(userId: string, socio: boolean) {
  const supabase = await createClient();
  const patch: { socio: boolean; socio_desde: string | null } = {
    socio,
    socio_desde: socio ? new Date().toISOString().slice(0, 10) : null,
  };
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/socios");
  return { ok: true };
}

export async function setRolAction(userId: string, role: string) {
  if (!["jugador", "admin", "super_admin"].includes(role)) {
    return { error: "Rol inválido" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function setCuotaAction(userId: string, cuota_mensual: number) {
  if (cuota_mensual < 0) return { error: "Monto inválido" };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ cuota_mensual }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/socios");
  return { ok: true };
}
