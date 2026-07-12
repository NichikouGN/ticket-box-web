import Navbar from "./Navbar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground relative transition-colors duration-350">
      {/* Content */}
      <div className="relative z-10">
        <Navbar />
        <main>{children}</main>
      </div>
    </div>
  );
}
