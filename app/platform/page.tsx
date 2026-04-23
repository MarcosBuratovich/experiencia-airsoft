import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PlatformHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? "/partidas" : "/login");
}
