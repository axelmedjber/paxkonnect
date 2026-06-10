"use client";

import type { ComponentProps, ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ActionFeedbackResult } from "@/lib/action-state";

type FeedbackAction = (formData: FormData) => Promise<ActionFeedbackResult>;

function showActionToast(result: ActionFeedbackResult) {
  if (!result) {
    return;
  }

  if (result.status === "error") {
    toast.error(result.message);
  } else {
    toast.success(result.message);
  }
}

export function ActionFeedbackForm({
  action,
  children,
  className,
  confirmMessage,
}: Readonly<{
  action: FeedbackAction;
  children: ReactNode;
  className?: string;
  confirmMessage?: string;
}>) {
  return (
    <form
      className={className}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      action={async (formData) => {
        showActionToast(await action(formData));
      }}
    >
      {children}
    </form>
  );
}

export function ActionFeedbackButton({
  action,
  ...buttonProps
}: Readonly<{ action: FeedbackAction } & Omit<ComponentProps<typeof Button>, "formAction">>) {
  return (
    <Button
      {...buttonProps}
      formAction={async (formData) => {
        showActionToast(await action(formData));
      }}
    />
  );
}
