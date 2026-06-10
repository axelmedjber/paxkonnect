"use client";

import { LogOutIcon, LoaderCircleIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { localizedPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(localizedPath(locale));
    router.refresh();
  }

  return (
    <Button type="button" variant="outline" disabled={isSigningOut} onClick={signOut}>
      {isSigningOut ? (
        <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
      ) : (
        <LogOutIcon data-icon="inline-start" />
      )}
      {t("sign_out")}
    </Button>
  );
}
