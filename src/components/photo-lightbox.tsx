"use client";

import { useCallback, useEffect } from "react";
import type { Photo, PhotoStatus } from "@/schemas";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  XIcon,
  HelpCircleIcon,
  ImageOffIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPhotoUrl, formatFileSize } from "@/lib/photo-utils";

interface PhotoLightboxProps {
  photo: Photo | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onStatusChange: (photoId: string, status: PhotoStatus) => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function PhotoLightbox({
  photo,
  onClose,
  onPrev,
  onNext,
  onStatusChange,
  hasPrev,
  hasNext,
}: PhotoLightboxProps) {
  const toggleKeep = useCallback(() => {
    if (!photo) return;
    const newStatus = photo.status === "keep" ? "unreviewed" : "keep";
    onStatusChange(photo.id, newStatus);
    if (newStatus === "keep" && hasNext) {
      onNext();
    }
  }, [photo, onStatusChange, hasNext, onNext]);

  const toggleDiscard = useCallback(() => {
    if (!photo) return;
    const newStatus = photo.status === "discard" ? "unreviewed" : "discard";
    onStatusChange(photo.id, newStatus);
    if (newStatus === "discard" && hasNext) {
      onNext();
    }
  }, [photo, onStatusChange, hasNext, onNext]);

  const toggleMaybe = useCallback(() => {
    if (!photo) return;
    const newStatus = photo.status === "maybe" ? "unreviewed" : "maybe";
    onStatusChange(photo.id, newStatus);
    if (newStatus === "maybe" && hasNext) {
      onNext();
    }
  }, [photo, onStatusChange, hasNext, onNext]);

  useEffect(() => {
    if (!photo) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
      } else if (e.key === "k") {
        e.preventDefault();
        toggleKeep();
      } else if (e.key === "d") {
        e.preventDefault();
        toggleDiscard();
      } else if (e.key === "m") {
        e.preventDefault();
        toggleMaybe();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photo, onPrev, onNext, toggleKeep, toggleDiscard, toggleMaybe]);

  return (
    <Dialog open={photo !== null} onOpenChange={() => onClose()}>
      <DialogContent
        className="max-w-6xl gap-2 border-0 p-4 shadow-2xl backdrop-blur-md rounded-2xl"
        showCloseButton
      >
        <DialogTitle className="sr-only">
          {photo?.fileName ?? "Photo"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Photo lightbox viewer with navigation and status controls
        </DialogDescription>
        {photo && (
          <>
            {/* Image with navigation arrows */}
            <div className="relative flex items-center justify-center">
              {hasPrev && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-1 z-10 size-10 rounded-full bg-background/80 shadow-lg backdrop-blur-sm transition-transform hover:scale-110"
                  onClick={onPrev}
                  aria-label="Previous photo"
                >
                  <ChevronLeftIcon className="size-5" />
                </Button>
              )}

              {!photo.fileExists ? (
                <div className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 rounded-lg bg-muted">
                  <ImageOffIcon className="size-12 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">
                    File no longer on disk
                  </p>
                </div>
              ) : (
                <img
                  src={getPhotoUrl(photo.projectId, photo.fileName)}
                  alt={photo.fileName}
                  className="max-h-[75vh] w-auto rounded-lg object-contain"
                />
              )}

              {hasNext && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 z-10 size-10 rounded-full bg-background/80 shadow-lg backdrop-blur-sm transition-transform hover:scale-110"
                  onClick={onNext}
                  aria-label="Next photo"
                >
                  <ChevronRightIcon className="size-5" />
                </Button>
              )}
            </div>

            {/* Metadata row */}
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
              data-testid="lightbox-metadata"
            >
              <span className="font-medium text-foreground">
                {photo.fileName}
              </span>
              <span aria-hidden="true" className="h-3.5 w-px bg-border" />
              <span>
                {photo.width} &times; {photo.height}
              </span>
              <span aria-hidden="true" className="h-3.5 w-px bg-border" />
              <span>{formatFileSize(photo.fileSizeBytes)}</span>
              {photo.takenAt && (
                <>
                  <span aria-hidden="true" className="h-3.5 w-px bg-border" />
                  <span>{new Date(photo.takenAt).toLocaleDateString()}</span>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant={photo.status === "keep" ? "default" : "outline"}
                size="sm"
                className={cn(
                  photo.status === "keep" &&
                    "bg-green-600 text-white hover:bg-green-700",
                )}
                onClick={toggleKeep}
              >
                <CheckIcon className="size-4" />
                {photo.status === "keep" ? "Kept" : "Keep"}
                <kbd className="ml-1.5 pointer-events-none inline-flex h-5 items-center rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
                  K
                </kbd>
              </Button>
              <Button
                variant={photo.status === "maybe" ? "default" : "outline"}
                size="sm"
                className={cn(
                  photo.status === "maybe" &&
                    "bg-amber-500 text-white hover:bg-amber-600",
                )}
                onClick={toggleMaybe}
              >
                <HelpCircleIcon className="size-4" />
                {photo.status === "maybe" ? "Maybe" : "Maybe"}
                <kbd className="ml-1.5 pointer-events-none inline-flex h-5 items-center rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
                  M
                </kbd>
              </Button>
              <Button
                variant={photo.status === "discard" ? "destructive" : "outline"}
                size="sm"
                onClick={toggleDiscard}
              >
                <XIcon className="size-4" />
                {photo.status === "discard" ? "Discarded" : "Discard"}
                <kbd className="ml-1.5 pointer-events-none inline-flex h-5 items-center rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
                  D
                </kbd>
              </Button>

              {photo.status !== "unreviewed" && (
                <Badge
                  className={cn(
                    "ml-auto",
                    photo.status === "keep" && "bg-green-600 text-white",
                    photo.status === "maybe" && "bg-amber-500 text-white",
                    photo.status === "discard" && "bg-destructive text-white",
                  )}
                >
                  {photo.status === "keep" && "Keep"}
                  {photo.status === "maybe" && "Maybe"}
                  {photo.status === "discard" && "Discard"}
                </Badge>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
