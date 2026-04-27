"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="w-full rounded-md border bg-card px-4 py-2 text-sm hover:bg-muted print:hidden"
    >
      Imprimir cierre Z
    </button>
  );
}
