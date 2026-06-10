"use client";

import { CheckIcon, LinkIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type EPKShareButtonProps = {
  url: string;
  label: string;
  successLabel: string;
  variant?: "default" | "outline";
};

export function EPKShareButton({ url, label, successLabel, variant = "outline" }: EPKShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const absoluteUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    await navigator.clipboard.writeText(absoluteUrl);
    setCopied(true);
    toast.success(successLabel);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <Button type="button" variant={variant} onClick={() => void copyLink()}>
      {copied ? <CheckIcon data-icon="inline-start" /> : <LinkIcon data-icon="inline-start" />}
      {label}
    </Button>
  );
}
