"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  numeroDisponible,
  PLAYER_NUMBER_REGEX,
} from "@/lib/player-number";
import { friendlyError, type FriendlyError } from "@/lib/errors";

const ERR = (input: unknown): { error: FriendlyError } => ({
  error: friendlyError(input),
});

/**
 * Verifica que el caller sea admin/super_admin antes de mutar.
 * Sin esto, un usuario normal podía llamar estas server actions desde
 * cualquier client (fetch, dev tools) — la RLS de profiles permite
 * UPDATE on own row (id = auth.uid()), entonces un user normal podía
 * updatearse a sí mismo el campo role a "admin" via
 * setRolAction(miId, "admin"). PRIVILEGE ESCALATION.
 */
async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ERR("No autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    return ERR("No autorizado");
  }
  return { supabase };
}

export async function setSocioAction(userId: string, socio: boolean) {
  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;
  const { supabase } = ctx;

  const patch: { socio: boolean; socio_desde: string | null } = {
    socio,
    socio_desde: socio ? new Date().toISOString().slice(0, 10) : null,
  };
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) return ERR(error);
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/socios");
  return { ok: true };
}

export async function setRolAction(userId: string, role: string) {
  if (!["jugador", "admin", "super_admin"].includes(role)) {
    return ERR("Rol inválido");
  }
  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;
  const { supabase } = ctx;

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return ERR(error);
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function setCuotaAction(userId: string, cuota_mensual: number) {
  if (cuota_mensual < 0) return ERR("Monto inválido");
  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;
  const { supabase } = ctx;

  const { error } = await supabase.from("profiles").update({ cuota_mensual }).eq("id", userId);
  if (error) return ERR(error);
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/socios");
  return { ok: true };
}

export async function setPlayerNumberAction(
  userId: string,
  numero: string | null,
) {
  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;
  const { supabase } = ctx;

  const valor = numero?.trim() ?? "";

  // Permitir vaciar (null) — útil si admin necesita reasignar
  if (valor === "") {
    const { error } = await supabase
      .from("profiles")
      .update({ player_number: null })
      .eq("id", userId);
    if (error) return ERR(error);
    revalidatePath("/admin/usuarios");
    return { ok: true };
  }

  if (!PLAYER_NUMBER_REGEX.test(valor)) {
    return ERR("Tienen que ser exactamente 6 dígitos");
  }

  const disponible = await numeroDisponible(supabase, valor, userId);
  if (!disponible) return ERR("Ese número ya está en uso");

  const { error } = await supabase
    .from("profiles")
    .update({ player_number: valor })
    .eq("id", userId);
  if (error) return ERR(error);
  revalidatePath("/admin/usuarios");
  return { ok: true };
}
