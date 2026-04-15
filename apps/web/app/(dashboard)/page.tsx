import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Bienvenido al sistema POS Chile
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard — próximamente</CardTitle>
          <CardDescription>
            KPIs, gráficos y métricas se implementarán en Fase 6
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <span className="font-medium">Usuario:</span> {user?.name}
          </p>
          <p className="text-sm">
            <span className="font-medium">Email:</span> {user?.email}
          </p>
          <p className="text-sm">
            <span className="font-medium">Rol:</span>{" "}
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {user?.rol}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
