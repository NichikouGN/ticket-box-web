import Navbar from "./Navbar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 relative">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600 rounded-full blur-3xl opacity-[0.07]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-600 rounded-full blur-3xl opacity-[0.05]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Navbar />
        <main>{children}</main>
      </div>
    </div>
  );
}
