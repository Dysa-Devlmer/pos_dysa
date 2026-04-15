import { LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import type { Session } from "next-auth";

export function Header({ user }: { user: Session["user"] }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-6">
      <div className="text-sm">
        <span className="font-medium">{user.name}</span>{" "}
        <span className="ml-2 inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {user.rol}
        </span>
      </div>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button type="submit" variant="ghost" size="sm">
          <LogOut className="size-4" />
          Cerrar sesión
        </Button>
      </form>
    </header>
  );
}
