import { Skeleton } from "@/components/ui/skeleton";

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/30 bg-card/40 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/30 bg-card/40 overflow-hidden">
          <Skeleton className="aspect-video w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-1/3 mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function KPISkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-card p-4 space-y-2">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      ))}
    </div>
  );
}
