import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOutAction } from "../actions";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/admin/richieste", label: "Richieste" },
  { href: "/admin/tavoli", label: "Tavoli" },
  { href: "/admin/orari", label: "Orari" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/impostazioni", label: "Impostazioni" },
];

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Meridiana Cafè
          </p>
          <p className="text-sm font-medium">Pannello staff</p>
        </div>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {user?.email && (
            <span className="text-sm text-muted-foreground">{user.email}</span>
          )}
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm">
              Esci
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 bg-muted/30 p-6">{children}</main>
    </div>
  );
}
