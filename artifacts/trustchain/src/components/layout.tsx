import { Link, useLocation } from "wouter";
import { Shield, LayoutDashboard, Network as NetworkIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const userName = localStorage.getItem("trustchain_userName") || "User";

  const handleLogout = () => {
    localStorage.removeItem("trustchain_userId");
    localStorage.removeItem("trustchain_userName");
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
            <Shield className="h-6 w-6" />
            <span className="font-bold text-xl tracking-tight text-foreground">TrustChain</span>
          </Link>
          
          <nav className="flex items-center gap-6">
            <Link 
              href="/dashboard" 
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                location === "/dashboard" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link 
              href="/network" 
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                location === "/network" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <NetworkIcon className="h-4 w-4" />
              Trust Network
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline-block">
              {userName}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}