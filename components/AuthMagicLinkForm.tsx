"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, ArrowRightIcon, LoaderCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRole } from "@/lib/types";

const createMagicLinkSchema = (messages: { required: string; invalid: string }) =>
  z.object({
    email: z.string().trim().min(1, messages.required).email(messages.invalid),
  });

type MagicLinkValues = {
  email: string;
};

type SelectableRole = Extract<ProfileRole, "artist" | "operator">;

type AuthMagicLinkFormProps = {
  initialRole: SelectableRole | null;
};

const roleCards: Array<{
  role: SelectableRole;
  icon: string;
  titleKey: string;
  descriptionKey: string;
}> = [
  {
    role: "artist",
    icon: "🎨",
    titleKey: "role_artist_title",
    descriptionKey: "role_artist_description",
  },
  {
    role: "operator",
    icon: "🎭",
    titleKey: "role_operator_title",
    descriptionKey: "role_operator_description",
  },
];

export function AuthMagicLinkForm({ initialRole }: AuthMagicLinkFormProps) {
  const t = useTranslations("auth");
  const [selectedRole, setSelectedRole] = useState<SelectableRole | null>(initialRole);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const magicLinkSchema = createMagicLinkSchema({
    required: t("email_required"),
    invalid: t("email_invalid"),
  });
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<MagicLinkValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: MagicLinkValues) {
    setSubmitError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { role: selectedRole ?? "artist" },
      },
    });

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setIsSubmitted(true);
  }

  if (isSubmitted) {
    return (
      <div className="rounded-lg border bg-secondary p-4 text-sm leading-6 text-secondary-foreground">
        {t("success")}
      </div>
    );
  }

  if (!selectedRole) {
    return (
      <div className="grid gap-5 md:grid-cols-2">
        {roleCards.map((card) => (
          <Card
            key={card.role}
            className="border-purple-100 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-zinc-800"
          >
            <CardContent className="flex h-full flex-col items-start gap-5 p-6">
              <span className="text-4xl" aria-hidden="true">
                {card.icon}
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-normal">{t(card.titleKey)}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{t(card.descriptionKey)}</p>
              </div>
              <Button type="button" className="mt-auto" onClick={() => setSelectedRole(card.role)}>
                {t("role_continue")}
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <form className="mx-auto flex max-w-md flex-col gap-4 rounded-lg border bg-card p-6 shadow-sm" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Button type="button" variant="ghost" className="w-fit px-0" onClick={() => setSelectedRole(null)}>
        <ArrowLeftIcon data-icon="inline-start" />
        {t("role_back")}
      </Button>
      <div>
        <h2 className="text-2xl font-semibold tracking-normal">
          {selectedRole === "artist" ? t("role_artist_title") : t("role_operator_title")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("magic_link_description")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="email">
          {t("email_label")}
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder={t("email_placeholder")}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email ? (
          <p id="email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      {submitError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : null}
        {t("submit")}
      </Button>
    </form>
  );
}
