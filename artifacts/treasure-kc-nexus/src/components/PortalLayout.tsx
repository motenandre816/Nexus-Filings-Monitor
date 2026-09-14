import React, { useState } from "react";
import { Link, useLocation, Switch, Route } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { Menu, X, LayoutDashboard, Building2, DownloadCloud, LogOut, ChevronDown, Clock3, BookOpenText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import Dashboard from "@/pages/dashboard";
import BrowseLlcs from "@/pages/llcs";
import LlcDetail from "@/pages/llc-detail";
import ScrapeControl from "@/pages/scrape";
import IngestionStatusPage from "@/pages/ingestion-status";
import MasteryGuidePage from "@/pages/mastery-guide";
import NotFound from "@/pages/not-found";

const NAVIGATION = [
  { name: "Command Center", href: "/portal", icon: LayoutDashboard },
  { name: "LLC Database", href: "/portal/llcs", icon: Building2 },
  { name: "Scrape Control", href: "/portal/scrape", icon: DownloadCloud },
  { name: "Ingestion Status", href: "/portal/ingestion-status", icon: Clock3 },
  { name: "Mastery Guide", href: "/portal/mastery-guide", icon: BookOpenText },
];

export function PortalLayout() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 md:flex flex-col border-r border-border bg-card">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <span className="font-bold text-primary-foreground text-sm">TK</span>
          </div>
          <span className="font-bold text-lg text-foreground tracking-tight">Treasure</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {NAVIGATION.map((item) => {
            const isActive = location === item.href || (location.startsWith(item.href) && item.href !== '/portal');
            return (
              <Link key={item.name} href={item.href}>
                <span className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}>
                  <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start h-auto p-2 gap-3">
                <Avatar className="w-8 h-8 rounded-md border border-border">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback className="rounded-md bg-primary/10 text-primary">
                    {user?.firstName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start flex-1 truncate">
                  <span className="text-sm font-medium leading-none truncate w-full">{user?.fullName || "Operator"}</span>
                  <span className="text-xs text-muted-foreground truncate w-full mt-1">{user?.primaryEmailAddress?.emailAddress}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="font-bold text-primary-foreground text-[10px]">TK</span>
            </div>
            <span className="font-bold text-sm">Treasure</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </header>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute inset-0 top-[61px] z-50 bg-background border-b border-border">
            <nav className="p-4 space-y-2">
              {NAVIGATION.map((item) => (
                <Link key={item.name} href={item.href}>
                  <span 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium ${
                      location === item.href || (location.startsWith(item.href) && item.href !== '/portal')
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </span>
                </Link>
              ))}
              <div className="pt-4 mt-4 border-t border-border">
                <Button variant="ghost" className="w-full justify-start text-destructive" onClick={() => signOut()}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </Button>
              </div>
            </nav>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-background p-4 md:p-8">
          <Switch>
            <Route path="/portal" component={Dashboard} />
            <Route path="/portal/llcs" component={BrowseLlcs} />
            <Route path="/portal/llcs/:id" component={LlcDetail} />
            <Route path="/portal/scrape" component={ScrapeControl} />
            <Route path="/portal/ingestion-status" component={IngestionStatusPage} />
            <Route path="/portal/mastery-guide" component={MasteryGuidePage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}
