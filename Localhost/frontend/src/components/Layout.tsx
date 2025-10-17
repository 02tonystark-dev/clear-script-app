import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Package, ShoppingCart, LogOut, Pill } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/inventory", icon: Package, label: "Inventory" },
    { path: "/sales", icon: ShoppingCart, label: "Sales" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Pill className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold text-foreground">PharmaCare</span>
              </div>
              <div className="hidden md:flex gap-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path}>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        className="gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
            <Button variant="outline" onClick={logout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
};

export default Layout;
