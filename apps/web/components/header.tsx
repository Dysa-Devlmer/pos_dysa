import type { Session } from "next-auth";
import { signOut } from "@/auth";
import { HeaderActions } from "@/components/header-actions";
import { SignOutInline, UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";

export function Header({
  user,
  avatar,
  alertasStockCount = 0,
}: {
  user: Session["user"];
  avatar: string | null;
  alertasStockCount?: number;
}) {
  // Header con fondo sólido (sin backdrop-filter): el `backdrop-blur` GPU-pesado
  // causaba 1-2 frames de "borroso" cuando el compositor del browser recomponía
  // la capa al volver a la pestaña (Chromium Memory Saver, Safari tab freeze).
  // Con bg sólido la capa se compone instantáneo en cualquier browser.
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 sm:px-6">
      {/* Mobile: hamburger + brand */}
      <div className="flex items-center gap-3 md:hidden">
        <MobileNav rol={user.rol} alertasStockCount={alertasStockCount} />
        <span className="text-base font-bold">POS Chile</span>
      </div>

      <div className="ml-auto">
        <HeaderActions>
          <ThemeToggle />
          <UserMenu
            nombre={user.name ?? "Usuario"}
            email={user.email ?? ""}
            rol={user.rol}
            avatar={avatar}
            signOutForm={
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
                className="w-full"
              >
                <SignOutInline />
              </form>
            }
          />
        </HeaderActions>
      </div>
    </header>
  );
}
