"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateProfileRole } from "@/app/actions/admin";
import type { ProfileRole } from "@/lib/types";

type AdminUserRoleSelectProps = {
  id: string;
  locale: string;
  role: ProfileRole;
};

const roles: ProfileRole[] = ["artist", "operator", "admin"];

export function AdminUserRoleSelect({ id, locale, role }: AdminUserRoleSelectProps) {
  const t = useTranslations("action_feedback");
  const [value, setValue] = useState(role);
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={value}
      disabled={isPending}
      className="h-9 rounded-md border bg-background px-2 text-sm disabled:opacity-60"
      onChange={(event) => {
        const previousRole = value;
        const nextRole = event.target.value as ProfileRole;
        setValue(nextRole);
        startTransition(async () => {
          const result = await updateProfileRole(id, nextRole, locale);

          if (!result.success) {
            setValue(previousRole);
            toast.error(t("error", { message: result.error }));
            return;
          }

          toast.success(t("saved"));
        });
      }}
    >
      {roles.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );
}
