import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/skeletons";

export default function UsuariosLoading() {
  return (
    <div className="space-y-6" aria-busy aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}
