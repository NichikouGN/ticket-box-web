import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Ticket, LogOut, User as UserIcon, Menu, X, Music, LayoutDashboard, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isOrganizer = user?.role === "ORGANIZER";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const navLinks = isOrganizer
    ? [
        { to: "/organizer", label: "Dashboard", icon: LayoutDashboard },
        { to: "/concerts", label: "Browse Events", icon: Music },
      ]
    : [
        { to: "/concerts", label: "Events", icon: Music },
        { to: "/tickets", label: "My Tickets", icon: Ticket },
      ];

  const isActive = (path: string) => {
    if (path === "/organizer") return location.pathname.startsWith("/organizer");
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to={isOrganizer ? "/organizer" : "/concerts"} className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm transition-colors duration-300">
            <Ticket className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground transition-colors duration-300">TicketBox</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1 ml-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                isActive(link.to)
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:text-foreground hover:bg-surface"
              )}
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* User info (desktop) */}
          <div className="hidden md:flex items-center gap-2 text-sm text-muted mr-1">
            <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center transition-colors duration-300">
              <UserIcon className="w-4 h-4 text-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground truncate max-w-[120px] transition-colors duration-300">
                {user?.full_name || user?.email}
              </span>
              <span className="text-[10px] text-muted uppercase tracking-wider transition-colors duration-300">
                {user?.role}
              </span>
            </div>
          </div>

          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted hover:text-foreground rounded-xl transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </Button>

          {/* Logout (desktop) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted hover:text-foreground hidden md:flex rounded-xl"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-muted hover:text-foreground"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive(link.to)
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:text-foreground hover:bg-surface"
                )}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}

            {/* Mobile theme toggle row */}
            <div className="border-t border-border mt-3 pt-3 flex items-center justify-between px-4 py-2">
              <span className="text-sm font-medium text-foreground">Theme</span>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="gap-2 rounded-xl border-border hover:bg-surface"
              >
                {theme === "light" ? (
                  <>
                    <Moon className="w-4 h-4" />
                    Dark Mode
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4" />
                    Light Mode
                  </>
                )}
              </Button>
            </div>

            <div className="border-t border-border mt-3 pt-3">
              <div className="flex items-center gap-3 px-4 py-2">
                <UserIcon className="w-4 h-4 text-foreground" />
                <div>
                  <p className="text-sm text-foreground">{user?.full_name || user?.email}</p>
                  <p className="text-xs text-muted uppercase">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={() => { handleLogout(); setMobileOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 w-full transition-all text-left mt-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
