import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function DocsPage() {
  const session = await auth();
  if (session?.user?.rol !== "ADMIN") {
    redirect("/");
  }
  // La UI de Scalar está en /api/docs (route handler)
  redirect("/api/docs");
}
