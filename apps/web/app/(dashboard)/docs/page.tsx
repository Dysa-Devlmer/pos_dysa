import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DocsClient } from "./docs-client";

export default async function DocsPage() {
  const session = await auth();
  if (session?.user?.rol !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Docs</h1>
        <p className="text-sm text-muted-foreground">
          Documentación interactiva de la API v1 (OpenAPI 3.0).
        </p>
      </div>
      <DocsClient />
    </div>
  );
}
