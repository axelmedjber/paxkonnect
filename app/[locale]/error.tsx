"use client";

import { AlertTriangleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-start justify-center gap-5 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 text-destructive">
        <AlertTriangleIcon data-icon="inline-start" />
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
      </div>
      <p className="text-muted-foreground">{t("description")}</p>
      <Button onClick={reset}>{t("try_again")}</Button>
    </main>
  );
}
