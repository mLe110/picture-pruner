"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FolderIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DirectoryEntry {
  name: string;
  path: string;
}

interface BrowseResponse {
  path: string;
  parent: string | null;
  entries: DirectoryEntry[];
}

interface FolderPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (path: string) => void;
  initialPath?: string;
}

export function FolderPicker({
  open,
  onOpenChange,
  onSelect,
  initialPath,
}: FolderPickerProps) {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const browse = useCallback(async (path?: string) => {
    setLoading(true);
    setError(null);

    const url = path
      ? `/api/filesystem/browse?path=${encodeURIComponent(path)}`
      : "/api/filesystem/browse";

    try {
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to browse directory");
        return;
      }
      const data: BrowseResponse = await res.json();
      setCurrentPath(data.path);
      setParentPath(data.parent);
      setEntries(data.entries);
    } catch {
      setError("Network error — could not browse directory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      browse(initialPath || undefined);
    }
  }, [open, initialPath, browse]);

  const pathSegments = currentPath.split("/").filter(Boolean);

  function handleBreadcrumbClick(index: number) {
    const path = "/" + pathSegments.slice(0, index + 1).join("/");
    browse(path);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>Select Folder</DialogTitle>
        <DialogDescription>
          Browse the filesystem and select a directory.
        </DialogDescription>

        <div className="flex items-center gap-1 overflow-x-auto text-sm">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => browse("/")}
            className="shrink-0"
          >
            /
          </Button>
          {pathSegments.map((segment, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRightIcon className="size-3 shrink-0 text-muted-foreground" />
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleBreadcrumbClick(i)}
                className="shrink-0"
              >
                {segment}
              </Button>
            </span>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-64 rounded-md border">
            <div className="p-2">
              {parentPath && (
                <button
                  type="button"
                  onClick={() => browse(parentPath)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <ArrowUpIcon className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">..</span>
                </button>
              )}
              {entries.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No subdirectories
                </p>
              )}
              {entries.map((entry) => (
                <button
                  key={entry.path}
                  type="button"
                  onClick={() => browse(entry.path)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <FolderIcon className="size-4 text-muted-foreground" />
                  <span className="truncate">{entry.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSelect(currentPath);
              onOpenChange(false);
            }}
            disabled={loading || !currentPath}
          >
            Select this folder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
