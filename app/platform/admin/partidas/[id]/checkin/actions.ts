"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Checkin = {
  presente: boolean;
  pago_estado: string | null;
  pago_monto: number | null;
  nota: string | null;
};

export async function upsertCheckinAction(inscripcionId: string, payload: Checkin) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase.from("checkins").upsert(
    {
      inscripcion_id: inscripcionId,
      admin_id: user.id,
      presente: payload.presente,
      pago_estado: payload.pago_estado,
      pago_monto: payload.pago_monto,
      nota: payload.nota,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "inscripcion_id" },
  );

  if (error) return { error: error.message };

  revalidatePath(`/admin/partidas`);
  return { ok: true };
}
