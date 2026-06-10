"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useState } from "react";

import { updateMatchingStatus } from "@/app/actions/admin";
import type { MatchingStatus } from "@/lib/types";

type AdminMatchingStatusSelectProps = {
  id: string;
  labels: Record<MatchingStatus, string>;
  locale: string;
  status: MatchingStatus;
};

const statuses: MatchingStatus[] = ["pending", "applied", "accepted", "rejected"];

export function AdminMatchingStatusSelect({
  id,
  labels,
  locale,
  status,
}: AdminMatchingStatusSelectProps) {
  const [value, setValue] = useState(status);
  const [isSaving, setIsSaving] = useState(false);

  async function changeStatus(nextStatus: MatchingStatus) {
    setValue(nextStatus);
    setIsSaving(true);
    const result = await updateMatchingStatus(id, nextStatus, locale);
    setIsSaving(false);

    if (!result.success) {
      setValue(status);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        className="h-9 rounded-md border bg-background px-2 text-sm"
        disabled={isSaving}
        onChange={(event) => void changeStatus(event.target.value as MatchingStatus)}
      >
        {statuses.map((currentStatus) => (
          <option key={currentStatus} value={currentStatus}>
            {labels[currentStatus]}
          </option>
        ))}
      </select>
      {isSaving ? <LoaderCircleIcon className="animate-spin text-muted-foreground" data-icon="inline-start" /> : null}
    </div>
  );
}
