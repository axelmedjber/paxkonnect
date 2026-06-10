"use client";

import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

type AdminDeleteButtonProps = {
  action: (formData: FormData) => void | Promise<void>;
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
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" size="sm" variant="outline">
        <Trash2Icon data-icon="inline-start" />
        {label}
      </Button>
    </form>
  );
}
