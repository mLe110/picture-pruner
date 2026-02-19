"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, FolderOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderPicker } from "@/components/folder-picker";

export function CreateProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [inputDir, setInputDir] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [outputFolderPickerOpen, setOutputFolderPickerOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          inputDir,
          ...(outputDir ? { outputDir } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create project");
        return;
      }

      setOpen(false);
      setName("");
      setInputDir("");
      setOutputDir("");
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="size-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Create Project</DialogTitle>
        <DialogDescription>
          Point to a directory of photos to start curating.
        </DialogDescription>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Philippines Trip 2025"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Input Directory</Label>
            <Button
              type="button"
              variant="outline"
              className="justify-start font-normal"
              onClick={() => setFolderPickerOpen(true)}
            >
              <FolderOpenIcon className="size-4 shrink-0" />
              <span className="truncate">
                {inputDir || "Select a folder..."}
              </span>
            </Button>
            {inputDir && (
              <p className="truncate text-xs text-muted-foreground">
                {inputDir}
              </p>
            )}
            <FolderPicker
              open={folderPickerOpen}
              onOpenChange={setFolderPickerOpen}
              onSelect={setInputDir}
              initialPath={inputDir || undefined}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Output Directory (optional)</Label>
            <Button
              type="button"
              variant="outline"
              className="justify-start font-normal"
              onClick={() => setOutputFolderPickerOpen(true)}
            >
              <FolderOpenIcon className="size-4 shrink-0" />
              <span className="truncate">
                {outputDir || "Select a folder..."}
              </span>
            </Button>
            {outputDir && (
              <p className="truncate text-xs text-muted-foreground">
                {outputDir}
              </p>
            )}
            <FolderPicker
              open={outputFolderPickerOpen}
              onOpenChange={setOutputFolderPickerOpen}
              onSelect={setOutputDir}
              initialPath={outputDir || undefined}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isSubmitting || !inputDir}>
            {isSubmitting ? "Creating..." : "Create Project"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
