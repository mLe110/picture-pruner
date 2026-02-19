"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FolderPicker } from "@/components/folder-picker";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
  projectId: string;
  outputDir?: string;
}

export function ExportButton({ projectId, outputDir }: ExportButtonProps) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [isSavingDir, setIsSavingDir] = useState(false);

  async function handleExport() {
    if (!outputDir) {
      setFolderPickerOpen(true);
      return;
    }

    setIsExporting(true);
    setResult(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/export`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setResult(data.error ?? "Export failed");
        return;
      }

      const data = await res.json();
      if (data.total === 0) {
        setResult("No photos to export");
      } else {
        const parts: string[] = [];
        if (data.exported > 0) parts.push(`${data.exported} exported`);
        if (data.skipped > 0) parts.push(`${data.skipped} skipped`);
        if (data.failed > 0) parts.push(`${data.failed} failed`);
        setResult(parts.join(", "));
      }
    } catch {
      setResult("Export failed");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleFolderSelect(selectedPath: string) {
    setIsSavingDir(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputDir: selectedPath }),
      });

      if (!res.ok) {
        const data = await res.json();
        setResult(data.error ?? "Failed to set output directory");
        return;
      }

      router.refresh();
      // Trigger export after setting directory
      setIsExporting(true);
      setResult(null);
      try {
        const exportRes = await fetch(`/api/projects/${projectId}/export`, {
          method: "POST",
        });

        if (!exportRes.ok) {
          const data = await exportRes.json();
          setResult(data.error ?? "Export failed");
          return;
        }

        const data = await exportRes.json();
        if (data.total === 0) {
          setResult("No photos to export");
        } else {
          const parts: string[] = [];
          if (data.exported > 0) parts.push(`${data.exported} exported`);
          if (data.skipped > 0) parts.push(`${data.skipped} skipped`);
          if (data.failed > 0) parts.push(`${data.failed} failed`);
          setResult(parts.join(", "));
        }
      } catch {
        setResult("Export failed");
      } finally {
        setIsExporting(false);
      }
    } catch {
      setResult("Failed to set output directory");
    } finally {
      setIsSavingDir(false);
    }
  }

  const isLoading = isExporting || isSavingDir;

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className="text-xs text-muted-foreground">{result}</span>
      )}
      <Button
        variant="outline"
        size="default"
        onClick={handleExport}
        disabled={isLoading}
      >
        <DownloadIcon className={cn("size-5", isLoading && "animate-pulse")} />
        {isLoading ? "Exporting..." : "Export"}
      </Button>
      {!outputDir && (
        <FolderPicker
          open={folderPickerOpen}
          onOpenChange={setFolderPickerOpen}
          onSelect={handleFolderSelect}
        />
      )}
    </div>
  );
}
