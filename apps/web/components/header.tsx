import type { Session } from "next-auth";
import { signOut } from "@/auth";
import { SignOutInline, UserMenu } from "@/components/user-menu";

export function Header({
  user,
  avatar,
}: {
  user: Session["user"];
  avatar: string | null;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <div className="md:hidden text-base font-bold">POS Chile</div>

      <div className="ml-auto">
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
      </div>
    </header>
  );
}
