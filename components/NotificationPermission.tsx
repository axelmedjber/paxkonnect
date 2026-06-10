"use client";

import { BellIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { savePushSubscription } from "@/app/actions/push";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output;
}

export function NotificationPermission() {
  const t = useTranslations("dashboard");
  const [hidden, setHidden] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!publicKey || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const dismissed = window.localStorage.getItem("paxkonnect-push-dismissed") === "true";
      setHidden(dismissed || Notification.permission !== "default");
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [publicKey]);

  const dismiss = () => {
    window.localStorage.setItem("paxkonnect-push-dismissed", "true");
    setHidden(true);
  };

  const enableNotifications = async () => {
    if (!publicKey) {
      setError(t("notifications_unavailable"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setError(t("notifications_denied"));
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        applicationServerKey: urlBase64ToUint8Array(publicKey),
        userVisibleOnly: true,
      });
      const result = await savePushSubscription(subscription.toJSON());

      if (!result.success) {
        setError(result.error);
        return;
      }

      setHidden(true);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("notifications_error"));
    } finally {
      setLoading(false);
    }
  };

  if (hidden) {
    return null;
  }

  return (
    <section className="rounded-lg border border-purple-100 bg-card p-5 shadow-sm dark:border-zinc-800">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-purple-50 text-primary dark:bg-purple-950">
            <BellIcon className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-normal">{t("notifications_title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("notifications_description")}</p>
            {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={() => void enableNotifications()} disabled={loading}>
            {loading ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : null}
            {t("notifications_enable")}
          </Button>
          <Button type="button" variant="outline" onClick={dismiss}>
            <XIcon data-icon="inline-start" />
            {t("notifications_later")}
          </Button>
        </div>
      </div>
    </section>
  );
}
