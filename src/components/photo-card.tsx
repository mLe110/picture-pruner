import type { Photo, PhotoStatus } from "@/schemas";
import { CheckIcon, XIcon, HelpCircleIcon, ImageOffIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPhotoUrl } from "@/lib/photo-utils";

interface PhotoCardProps {
  photo: Photo;
  onStatusChange: (photoId: string, status: PhotoStatus) => void;
  onClick: (photoId: string) => void;
}

export function PhotoCard({ photo, onStatusChange, onClick }: PhotoCardProps) {
  const isKeep = photo.status === "keep";
  const isDiscard = photo.status === "discard";
  const isMaybe = photo.status === "maybe";
  const isRemoved = !photo.fileExists;

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid="photo-card"
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
        isKeep && "ring-2 ring-green-500/70 shadow-green-500/10",
        isMaybe && "ring-2 ring-amber-500/70 shadow-amber-500/10",
        isDiscard && "opacity-75",
        isRemoved && "border-dashed opacity-60",
      )}
      onClick={() => onClick(photo.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(photo.id);
        }
      }}
    >
      <div className="relative aspect-square overflow-hidden">
        {isRemoved ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted">
            <ImageOffIcon className="size-8 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              File removed
            </span>
          </div>
        ) : (
          <img
            src={getPhotoUrl(photo.projectId, photo.fileName)}
            alt={photo.fileName}
            className={cn(
              "h-full w-full object-cover transition-all",
              isDiscard && "grayscale opacity-50",
            )}
            loading="lazy"
          />
        )}

        {/* Status badge */}
        {isKeep && (
          <Badge className="absolute top-2 left-2 bg-green-600 text-white hover:bg-green-600">
            Keep
          </Badge>
        )}
        {isDiscard && (
          <Badge variant="destructive" className="absolute top-2 left-2">
            Discard
          </Badge>
        )}
        {isMaybe && (
          <Badge className="absolute top-2 left-2 bg-amber-500 text-white hover:bg-amber-500">
            Maybe
          </Badge>
        )}

        {/* Kept checkmark indicator */}
        {isKeep && (
          <div className="pointer-events-none absolute bottom-2 right-2 flex size-6 items-center justify-center rounded-full bg-green-600 text-white shadow-md">
            <CheckIcon className="size-3.5" />
          </div>
        )}

        {/* Hover overlay with action buttons */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 backdrop-blur-0 transition-all group-hover:bg-black/30 group-hover:backdrop-blur-[2px] group-hover:opacity-100">
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              "rounded-full shadow-md",
              isKeep && "bg-green-600 text-white hover:bg-green-700",
            )}
            aria-label="Keep photo"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(photo.id, isKeep ? "unreviewed" : "keep");
            }}
          >
            <CheckIcon className="size-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              "rounded-full shadow-md",
              isMaybe && "bg-amber-500 text-white hover:bg-amber-600",
            )}
            aria-label="Maybe photo"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(photo.id, isMaybe ? "unreviewed" : "maybe");
            }}
          >
            <HelpCircleIcon className="size-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              "rounded-full shadow-md",
              isDiscard && "bg-destructive text-white hover:bg-destructive/90",
            )}
            aria-label="Discard photo"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(photo.id, isDiscard ? "unreviewed" : "discard");
            }}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      </div>

      {/* Filename label */}
      <div className="px-2.5 py-2">
        <p className="truncate text-xs font-medium text-muted-foreground">
          {photo.fileName}
        </p>
      </div>
    </div>
  );
}
