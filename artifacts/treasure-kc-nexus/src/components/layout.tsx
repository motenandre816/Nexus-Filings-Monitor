import { Link, useLocation } from "wouter";
import { LayoutDashboard, List, FileSearch, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Browse LLCs", href: "/llcs", icon: List },
    { name: "Scraper Control", href: "/scrape", icon: FileSearch },
  ];

  return (
    <div className="min-h-[100dvh] flex w-full bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border gap-3">
          <Building2 className="w-6 h-6 text-sidebar-primary" />
          <div>
            <div className="font-bold text-sm tracking-tight text-sidebar-primary-foreground">Treasure KC</div>
            <div className="text-[10px] text-sidebar-primary-foreground/70 uppercase font-semibold">Moten Global Solutions LLC</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navigation.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card flex items-center px-8 shadow-sm z-10">
          <h1 className="text-xl font-bold text-card-foreground tracking-tight">Treasure KC</h1>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
