"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SyncButtonProps {
  projectId: string;
}

export function SyncButton({ projectId }: SyncButtonProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    setIsSyncing(true);
    setResult(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/sync`, {
        method: "POST",
      });

      if (!res.ok) {
        setResult("Sync failed");
        return;
      }

      const data = await res.json();
      const parts: string[] = [];
      if (data.added > 0) parts.push(`${data.added} added`);
      if (data.removed > 0) parts.push(`${data.removed} removed`);
      if (data.restored > 0) parts.push(`${data.restored} restored`);

      setResult(parts.length > 0 ? parts.join(", ") : "No changes");
      router.refresh();
    } catch {
      setResult("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className="text-xs text-muted-foreground">{result}</span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isSyncing}
      >
        <RefreshCwIcon className={cn("size-4", isSyncing && "animate-spin")} />
        {isSyncing ? "Syncing..." : "Sync"}
      </Button>
    </div>
  );
}
