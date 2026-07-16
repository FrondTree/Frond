"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyCommand({
  command,
  className,
}: {
  command: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-card pl-3 pr-1 font-mono text-sm text-foreground",
        className,
      )}
    >
      <span className="select-all py-2">{command}</span>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => void copy()} aria-label="Copy command">
        {copied ? <Check className="text-primary" /> : <Copy />}
      </Button>
    </div>
  );
}
