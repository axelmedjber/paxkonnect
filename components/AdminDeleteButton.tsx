"use client";

import { Trash2Icon } from "lucide-react";

import { ActionFeedbackForm } from "@/components/ActionFeedbackForm";
import { Button } from "@/components/ui/button";
import type { ActionFeedbackResult } from "@/lib/action-state";

type AdminDeleteButtonProps = {
  action: (formData: FormData) => Promise<ActionFeedbackResult>;
  confirmMessage: string;
  id: string;
  label: string;
  locale: string;
};

export function AdminDeleteButton({
  action,
  confirmMessage,
  id,
  label,
  locale,
}: AdminDeleteButtonProps) {
  return (
    <ActionFeedbackForm action={action} confirmMessage={confirmMessage}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" size="sm" variant="outline">
        <Trash2Icon data-icon="inline-start" />
        {label}
      </Button>
    </ActionFeedbackForm>
  );
}
