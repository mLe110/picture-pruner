import Link from "next/link";
import { ChevronRightIcon, ScissorsIcon } from "lucide-react";
import { SyncButton } from "@/components/sync-button";
import { ExportButton } from "@/components/export-button";

interface HeaderProps {
  projectName?: string;
  projectId?: string;
  outputDir?: string;
}

export function Header({ projectName, projectId, outputDir }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <Link href="/projects" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
              <ScissorsIcon className="size-4" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Picture Pruner</h1>
          </Link>
          {projectName && (
            <>
              <ChevronRightIcon className="size-4 text-muted-foreground" />
              <span className="text-lg font-medium text-muted-foreground">
                {projectName}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {projectId && (
            <ExportButton projectId={projectId} outputDir={outputDir} />
          )}
          {projectId && <SyncButton projectId={projectId} />}
        </div>
      </div>
    </header>
  );
}
