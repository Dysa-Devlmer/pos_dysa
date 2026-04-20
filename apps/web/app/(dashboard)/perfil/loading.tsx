import { PerfilSkeleton } from "@/components/skeletons";

export default function PerfilLoading() {
  return (
    <div aria-busy aria-live="polite">
      <PerfilSkeleton />
    </div>
  );
}
