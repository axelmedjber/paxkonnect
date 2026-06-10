"use client";

import { useTransition } from "react";

import { updateProfileRole } from "@/app/actions/admin";
import type { ProfileRole } from "@/lib/types";

type AdminUserRoleSelectProps = {
  id: string;
  locale: string;
  role: ProfileRole;
};

const roles: ProfileRole[] = ["artist", "operator", "admin"];

export function AdminUserRoleSelect({ id, locale, role }: AdminUserRoleSelectProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={role}
      disabled={isPending}
      className="h-9 rounded-md border bg-background px-2 text-sm disabled:opacity-60"
      onChange={(event) => {
        const nextRole = event.target.value as ProfileRole;
        startTransition(() => {
          void updateProfileRole(id, nextRole, locale);
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
