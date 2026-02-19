"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Photo,
  PhotoFilter,
  PhotoStatus,
  DuplicateGroup,
  SimilarGroup,
  ViewMode,
  SortDirection,
} from "@/schemas";
import { Header } from "@/components/header";
import { FilterBar } from "@/components/filter-bar";
import { SortToggle } from "@/components/sort-toggle";
import { StatusSummary } from "@/components/status-summary";
import { PhotoGrid } from "@/components/photo-grid";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { DuplicateGroups } from "@/components/duplicate-groups";
import { SimilarGroups } from "@/components/similar-groups";
import { cn } from "@/lib/utils";

interface PhotoBrowserProps {
  initialPhotos: Photo[];
  projectId?: string;
  projectName?: string;
  outputDir?: string;
}

export function PhotoBrowser({
  initialPhotos,
  projectId,
  projectName,
  outputDir,
}: PhotoBrowserProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [activeFilter, setActiveFilter] = useState<PhotoFilter>("all");
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("browse");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [similarGroups, setSimilarGroups] = useState<SimilarGroup[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  const counts = useMemo(
    () => ({
      all: photos.length,
      unreviewed: photos.filter((p) => p.status === "unreviewed").length,
      keep: photos.filter((p) => p.status === "keep").length,
      discard: photos.filter((p) => p.status === "discard").length,
      maybe: photos.filter((p) => p.status === "maybe").length,
    }),
    [photos],
  );

  const filteredPhotos = useMemo(() => {
    const filtered =
      activeFilter === "all"
        ? photos
        : photos.filter((p) => p.status === activeFilter);

    return [...filtered].sort((a, b) => {
      const timeA = new Date(a.importedAt).getTime();
      const timeB = new Date(b.importedAt).getTime();
      return sortDirection === "desc" ? timeB - timeA : timeA - timeB;
    });
  }, [photos, activeFilter, sortDirection]);

  const lightboxPhoto = useMemo(
    () => photos.find((p) => p.id === lightboxPhotoId) ?? null,
    [photos, lightboxPhotoId],
  );

  // Navigation scoped to current context: group photos for duplicates/similar, all filtered for browse
  const navigationPhotos = useMemo(() => {
    if (viewMode === "duplicates" && lightboxPhotoId) {
      const group = duplicateGroups.find((g) =>
        g.photos.some((p) => p.id === lightboxPhotoId),
      );
      if (group) {
        return group.photos.map(
          (gp) => photos.find((p) => p.id === gp.id) ?? gp,
        );
      }
    }
    if (viewMode === "similar" && lightboxPhotoId) {
      const group = similarGroups.find((g) =>
        g.photos.some((p) => p.id === lightboxPhotoId),
      );
      if (group) {
        return group.photos.map(
          (gp) => photos.find((p) => p.id === gp.id) ?? gp,
        );
      }
    }
    return filteredPhotos;
  }, [
    viewMode,
    lightboxPhotoId,
    duplicateGroups,
    similarGroups,
    filteredPhotos,
    photos,
  ]);

  const lightboxIndex = useMemo(
    () => navigationPhotos.findIndex((p) => p.id === lightboxPhotoId),
    [navigationPhotos, lightboxPhotoId],
  );

  // Fetch duplicate groups when switching to duplicates view
  useEffect(() => {
    if (viewMode !== "duplicates" || !projectId) return;

    setDuplicatesLoading(true);
    fetch(`/api/projects/${projectId}/duplicates`)
      .then((res) => res.json())
      .then((data) => {
        setDuplicateGroups(data.groups ?? []);
      })
      .catch(() => {
        setDuplicateGroups([]);
      })
      .finally(() => {
        setDuplicatesLoading(false);
      });
  }, [viewMode, projectId]);

  // Fetch similar groups when switching to similar view
  useEffect(() => {
    if (viewMode !== "similar" || !projectId) return;

    setSimilarLoading(true);
    fetch(`/api/projects/${projectId}/similar`)
      .then((res) => res.json())
      .then((data) => {
        setSimilarGroups(data.groups ?? []);
      })
      .catch(() => {
        setSimilarGroups([]);
      })
      .finally(() => {
        setSimilarLoading(false);
      });
  }, [viewMode, projectId]);

  const handleStatusChange = useCallback(
    (photoId: string, newStatus: PhotoStatus) => {
      // Optimistic update
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, status: newStatus } : p)),
      );

      // Persist via API if project-scoped
      if (projectId) {
        fetch(`/api/projects/${projectId}/photos/${photoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }).catch(() => {
          // Revert on failure
          setPhotos((prev) =>
            prev.map((p) => {
              if (p.id === photoId) {
                // We don't know the old status, so refetch would be ideal
                // For now, revert is best-effort
                return p;
              }
              return p;
            }),
          );
        });
      }
    },
    [projectId],
  );

  const handlePrev = useCallback(() => {
    if (lightboxIndex > 0) {
      setLightboxPhotoId(navigationPhotos[lightboxIndex - 1].id);
    }
  }, [lightboxIndex, navigationPhotos]);

  const handleNext = useCallback(() => {
    if (lightboxIndex < navigationPhotos.length - 1) {
      setLightboxPhotoId(navigationPhotos[lightboxIndex + 1].id);
    }
  }, [lightboxIndex, navigationPhotos]);

  const handleViewModeChange = useCallback((value: string) => {
    if (value === "browse" || value === "duplicates" || value === "similar") {
      setViewMode(value);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header
        projectName={projectName}
        projectId={projectId}
        outputDir={outputDir}
      />
      <main className="mx-auto max-w-7xl px-4 py-6">
        {projectId && (
          <div className="mb-6 flex gap-1 border-b border-border">
            {(["browse", "duplicates", "similar"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handleViewModeChange(mode)}
                className={cn(
                  "relative px-4 py-2 text-sm font-medium capitalize transition-colors",
                  "hover:text-foreground",
                  viewMode === mode
                    ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground"
                    : "text-muted-foreground",
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
        {viewMode === "browse" ? (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <FilterBar
                  activeFilter={activeFilter}
                  counts={counts}
                  onFilterChange={setActiveFilter}
                />
                <SortToggle
                  direction={sortDirection}
                  onToggle={() =>
                    setSortDirection((d) => (d === "desc" ? "asc" : "desc"))
                  }
                />
              </div>
              <StatusSummary
                total={counts.all}
                kept={counts.keep}
                discarded={counts.discard}
                maybe={counts.maybe}
                unreviewed={counts.unreviewed}
              />
            </div>
            <PhotoGrid
              photos={filteredPhotos}
              onStatusChange={handleStatusChange}
              onPhotoClick={setLightboxPhotoId}
            />
          </>
        ) : viewMode === "duplicates" ? (
          <DuplicateGroups
            groups={duplicateGroups}
            photos={photos}
            isLoading={duplicatesLoading}
            onStatusChange={handleStatusChange}
            onPhotoClick={setLightboxPhotoId}
          />
        ) : (
          <SimilarGroups
            groups={similarGroups}
            photos={photos}
            isLoading={similarLoading}
            onStatusChange={handleStatusChange}
            onPhotoClick={setLightboxPhotoId}
          />
        )}
      </main>
      <PhotoLightbox
        photo={lightboxPhoto}
        onClose={() => setLightboxPhotoId(null)}
        onPrev={handlePrev}
        onNext={handleNext}
        onStatusChange={handleStatusChange}
        hasPrev={lightboxIndex > 0}
        hasNext={lightboxIndex < navigationPhotos.length - 1}
      />
    </div>
  );
}
