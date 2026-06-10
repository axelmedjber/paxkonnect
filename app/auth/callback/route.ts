import { NextResponse } from "next/server";

import { sendWelcomeEmail } from "@/app/actions/sendEmail";
import { isArtistProfileComplete } from "@/lib/profile-completion";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!isArtistProfileComplete(profile)) {
        if (!profile?.stage_name && user.email) {
          await sendWelcomeEmail(user.email, "fr", origin);
        }

        return NextResponse.redirect(`${origin}/fr/profile/edit?welcome=1`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/fr/dashboard`);
}
