import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, AlertTriangle, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalMedicines: 0,
    lowStock: 0,
    totalSales: 0,
    todaySales: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: medicines, error: medicinesError } = await supabase
        .from("medicines")
        .select("*");

      if (medicinesError) throw medicinesError;

      const lowStockItems = medicines?.filter(
        (m) => m.quantity_in_stock <= m.reorder_level
      ) || [];

      const today = new Date().toISOString().split("T")[0];
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("total_price, sale_date");

      if (salesError) throw salesError;

      const todaySalesData = sales?.filter(
        (s) => s.sale_date.startsWith(today)
      ) || [];

      const totalSalesAmount = sales?.reduce(
        (sum, sale) => sum + Number(sale.total_price),
        0
      ) || 0;

      const todaySalesAmount = todaySalesData.reduce(
        (sum, sale) => sum + Number(sale.total_price),
        0
      );

      setStats({
        totalMedicines: medicines?.length || 0,
        lowStock: lowStockItems.length,
        totalSales: sales?.length || 0,
        todaySales: todaySalesAmount,
      });
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
      value: stats.totalMedicines,
      icon: Package,
      color: "text-primary",
    },
    {
      title: "Low Stock Items",
      value: stats.lowStock,
      icon: AlertTriangle,
      color: "text-destructive",
    },
    {
      title: "Total Sales",
      value: stats.totalSales,
      icon: ShoppingCart,
      color: "text-secondary",
    },
    {
      title: "Today's Revenue",
      value: `$${stats.todaySales.toFixed(2)}`,
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
