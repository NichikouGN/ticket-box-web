import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Ticket, LogOut, User as UserIcon, Menu, X, Music, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { user, logout } = useAuth();
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
      ];

  const isActive = (path: string) => {
    if (path === "/organizer") return location.pathname.startsWith("/organizer");
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to={isOrganizer ? "/organizer" : "/concerts"} className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">TicketBox</span>
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
                  ? "bg-violet-500/15 text-violet-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
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
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-300 mr-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20 flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-violet-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white truncate max-w-[120px]">
                {user?.full_name || user?.email}
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                {user?.role}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-400 hover:text-white hidden md:flex"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-slate-400"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive(link.to)
                    ? "bg-violet-500/15 text-violet-400"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}

            <div className="border-t border-slate-800 mt-3 pt-3">
              <div className="flex items-center gap-3 px-4 py-2">
                <UserIcon className="w-4 h-4 text-violet-400" />
                <div>
                  <p className="text-sm text-white">{user?.full_name || user?.email}</p>
                  <p className="text-xs text-slate-500 uppercase">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={() => { handleLogout(); setMobileOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 w-full transition-all"
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
