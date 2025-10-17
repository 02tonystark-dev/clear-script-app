import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

const Sales = () => {
  const [sales, setSales] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const data = await api.sales.getAll();
      setSales(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Sales Management</h1>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Sale
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          {sales.length} sales recorded
        </div>
      </div>
    </Layout>
  );
};

export default Sales;
