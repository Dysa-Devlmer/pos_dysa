import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/skeletons";

export default function ProductosLoading() {
  return (
    <div className="space-y-6" aria-busy aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>
      <TableSkeleton rows={8} columns={7} />
    </div>
  );
}
