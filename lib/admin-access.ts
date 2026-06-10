import "server-only";

import type { User } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AdminAccess =
  | { ok: true; user: User; adminSupabase: ReturnType<typeof createAdminClient> }
  | { ok: false; reason: "not_signed_in" | "forbidden" };

export async function getAdminAccess(): Promise<AdminAccess> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey || serviceRoleKey === "your_service_role_key") {
    return { ok: false, reason: "forbidden" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "not_signed_in" };
  }

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false, reason: "forbidden" };
  }

  return { ok: true, user, adminSupabase };
}
