import type { Photo, PhotoStatus } from "@/schemas";
import { ImageIcon } from "lucide-react";
import { PhotoCard } from "@/components/photo-card";

interface PhotoGridProps {
  photos: Photo[];
  onStatusChange: (photoId: string, status: PhotoStatus) => void;
  onPhotoClick: (photoId: string) => void;
}

export function PhotoGrid({
  photos,
  onStatusChange,
  onPhotoClick,
}: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
          <ImageIcon className="size-6 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">
          No photos to display
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try changing your filter or importing some photos.
        </p>
      </div>
    );
  }

  return (
    <div className="grid auto-rows-auto grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
      {photos.map((photo) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          onStatusChange={onStatusChange}
          onClick={onPhotoClick}
        />
      ))}
    </div>
  );
}
