import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AuthMagicLinkForm } from "@/components/AuthMagicLinkForm";
import { localizedPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRole } from "@/lib/types";

type AuthPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ role?: string }>;
};

function getSelectedRole(role: string | undefined): Extract<ProfileRole, "artist" | "operator"> | null {
  return role === "artist" || role === "operator" ? role : null;
}

export default async function AuthPage({ params, searchParams }: AuthPageProps) {
  const { locale } = await params;
  const { role } = await searchParams;
  const t = await getTranslations("auth");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(localizedPath(locale, "/dashboard"));
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-semibold tracking-normal">{t("title")}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{t("description")}</p>
        </div>
        <AuthMagicLinkForm initialRole={getSelectedRole(role)} />
      </div>
    </main>
  );
}
