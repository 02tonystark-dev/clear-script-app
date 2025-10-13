import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Sale {
  id: string;
  medicine_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  customer_name: string;
  customer_phone: string;
  sale_date: string;
  notes: string;
  medicines: {
    name: string;
  };
}

interface Medicine {
  id: string;
  name: string;
  unit_price: number;
  quantity_in_stock: number;
}

const Sales = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    medicine_id: "",
    quantity: "",
    customer_name: "",
    customer_phone: "",
    notes: "",
  });

  useEffect(() => {
    fetchSales();
    fetchMedicines();
  }, []);

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from("sales")
      .select(`
        *,
        medicines (name)
      `)
      .order("sale_date", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSales(data || []);
    }
  };

  const fetchMedicines = async () => {
    const { data, error } = await supabase
      .from("medicines")
      .select("id, name, unit_price, quantity_in_stock")
      .gt("quantity_in_stock", 0)
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setMedicines(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const medicine = medicines.find((m) => m.id === formData.medicine_id);
    if (!medicine) {
      toast({
        title: "Error",
        description: "Please select a medicine",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseInt(formData.quantity);
    if (quantity > medicine.quantity_in_stock) {
      toast({
        title: "Error",
        description: "Insufficient stock available",
        variant: "destructive",
      });
      return;
    }

    const totalPrice = medicine.unit_price * quantity;

    const { data: session } = await supabase.auth.getSession();
    
    const saleData = {
      medicine_id: formData.medicine_id,
      quantity,
      unit_price: medicine.unit_price,
      total_price: totalPrice,
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone,
      notes: formData.notes,
      sold_by: session.session?.user.id,
    };

    const { error: saleError } = await supabase.from("sales").insert([saleData]);

    if (saleError) {
      toast({
        title: "Error",
        description: saleError.message,
        variant: "destructive",
      });
      return;
    }

    const newStock = medicine.quantity_in_stock - quantity;
    const { error: updateError } = await supabase
      .from("medicines")
      .update({ quantity_in_stock: newStock })
      .eq("id", formData.medicine_id);

    if (updateError) {
      toast({
        title: "Error",
        description: updateError.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Sale recorded successfully",
    });

    resetForm();
    fetchSales();
    fetchMedicines();
  };

  const resetForm = () => {
    setFormData({
      medicine_id: "",
      quantity: "",
      customer_name: "",
      customer_phone: "",
      notes: "",
    });
    setDialogOpen(false);
  };

  const selectedMedicine = medicines.find((m) => m.id === formData.medicine_id);
  const totalPrice = selectedMedicine
    ? selectedMedicine.unit_price * parseInt(formData.quantity || "0")
    : 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Sales Management</h1>
            <p className="text-muted-foreground">Record and track medicine sales</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={resetForm}>
                <Plus className="h-4 w-4" />
                New Sale
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record New Sale</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="medicine">Medicine *</Label>
                  <Select
                    value={formData.medicine_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, medicine_id: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select medicine" />
                    </SelectTrigger>
                    <SelectContent>
                      {medicines.map((medicine) => (
                        <SelectItem key={medicine.id} value={medicine.id}>
                          {medicine.name} - ${medicine.unit_price.toFixed(2)} (Stock:{" "}
                          {medicine.quantity_in_stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={selectedMedicine?.quantity_in_stock || 1}
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                    required
                  />
                  {selectedMedicine && (
                    <p className="text-sm text-muted-foreground">
                      Available stock: {selectedMedicine.quantity_in_stock}
                    </p>
                  )}
                </div>

                {formData.quantity && selectedMedicine && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">
                      Total Price: ${totalPrice.toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_phone">Customer Phone</Label>
                  <Input
                    id="customer_phone"
                    value={formData.customer_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_phone: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">Record Sale</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Medicine</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium">
                    {sale.medicines?.name}
                  </TableCell>
                  <TableCell>{sale.quantity}</TableCell>
                  <TableCell>${sale.unit_price.toFixed(2)}</TableCell>
                  <TableCell className="font-semibold">
                    ${sale.total_price.toFixed(2)}
                  </TableCell>
                  <TableCell>{sale.customer_name || "-"}</TableCell>
                  <TableCell>{sale.customer_phone || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
};

export default Sales;
