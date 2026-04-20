import { DashboardSkeleton } from "@/components/skeletons";

export default function DashboardLoading() {
  return (
    <div aria-busy aria-live="polite">
      <DashboardSkeleton />
    </div>
  );
}
