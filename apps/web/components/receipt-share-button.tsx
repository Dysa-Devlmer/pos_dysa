"use client";

import * as React from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export interface ReceiptShareButtonProps {
  url?: string;
  path?: string;
  title: string;
  text: string;
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}

export function ReceiptShareButton({
  url,
  path,
  title,
  text,
  label = "Compartir",
  variant = "outline",
  size = "sm",
  className,
}: ReceiptShareButtonProps) {
  const handleShare = async () => {
    const finalUrl =
      url ??
      (path && typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : "");
    if (!finalUrl) return;

    const message = `${text}\n${finalUrl}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: finalUrl });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(finalUrl);
        toast.success("Link copiado", {
          description: "El comprobante quedó listo para pegarlo donde quieras.",
        });
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleShare}
    >
      <Share2 className="size-4" />
      {label}
    </Button>
  );
}
