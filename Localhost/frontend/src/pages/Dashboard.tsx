import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, AlertTriangle, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_medicines: 0,
    low_stock_count: 0,
    total_sales: 0,
    today_sales: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await api.dashboard.getStats();
      setStats(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const statCards = [
    {
      title: "Total Medicines",
      value: stats.total_medicines,
      icon: Package,
      color: "text-primary",
    },
    {
      title: "Low Stock Items",
      value: stats.low_stock_count,
      icon: AlertTriangle,
      color: "text-destructive",
    },
    {
      title: "Total Sales",
      value: stats.total_sales,
      icon: ShoppingCart,
      color: "text-secondary",
    },
    {
      title: "Today's Revenue",
      value: `$${stats.today_sales.toFixed(2)}`,
      icon: DollarSign,
      color: "text-secondary",
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to PharmaCare Management System</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
