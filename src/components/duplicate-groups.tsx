"use client";

import type { DuplicateGroup, Photo, PhotoStatus } from "@/schemas";
import { CopyIcon, CheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhotoCard } from "@/components/photo-card";

interface DuplicateGroupsProps {
  groups: DuplicateGroup[];
  photos: Photo[];
  isLoading: boolean;
  onStatusChange: (photoId: string, status: PhotoStatus) => void;
  onPhotoClick: (photoId: string) => void;
}

export function DuplicateGroups({
  groups,
  photos,
  isLoading,
  onStatusChange,
  onPhotoClick,
}: DuplicateGroupsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted animate-pulse">
          <CopyIcon className="size-6 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">
          Scanning for duplicates...
        </p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
          <CheckIcon className="size-6 text-green-500" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">
          No duplicates found
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          All photos in this project are unique.
        </p>
      </div>
    );
  }

  function handleKeepFirstDiscardRest(group: DuplicateGroup) {
    const [first, ...rest] = group.photos;
    // Keep the first photo if it's not already kept
    if (first.status !== "keep") {
      onStatusChange(first.id, "keep");
    }
    // Discard the rest
    for (const photo of rest) {
      if (photo.status !== "discard") {
        onStatusChange(photo.id, "discard");
      }
    }
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        // Use canonical photos state for up-to-date statuses
        const groupPhotos = group.photos.map(
          (gp) => photos.find((p) => p.id === gp.id) ?? gp,
        );
        const allResolved = groupPhotos.every(
          (p) => p.status === "keep" || p.status === "discard",
        );

        return (
          <div
            key={group.hash}
            className={`rounded-xl border bg-card p-4 shadow-sm ${allResolved ? "opacity-60" : ""}`}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{groupPhotos.length} photos</Badge>
                <span className="font-mono text-xs text-muted-foreground">
                  {group.hash.slice(0, 12)}...
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleKeepFirstDiscardRest({ ...group, photos: groupPhotos })
                }
                disabled={allResolved}
              >
                Keep first, discard rest
              </Button>
            </div>
            <div className="grid auto-rows-auto grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
              {groupPhotos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  onStatusChange={onStatusChange}
                  onClick={onPhotoClick}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
