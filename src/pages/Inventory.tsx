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
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Medicine {
  id: string;
  name: string;
  generic_name: string;
  category_id: string;
  manufacturer: string;
  unit_price: number;
  quantity_in_stock: number;
  reorder_level: number;
  expiry_date: string;
  batch_number: string;
}

interface Category {
  id: string;
  name: string;
}

const Inventory = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    generic_name: "",
    category_id: "",
    manufacturer: "",
    unit_price: "",
    quantity_in_stock: "",
    reorder_level: "10",
    expiry_date: "",
    batch_number: "",
  });

  useEffect(() => {
    fetchMedicines();
    fetchCategories();
  }, []);

  const fetchMedicines = async () => {
    const { data, error } = await supabase
      .from("medicines")
      .select("*")
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

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("medicine_categories")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCategories(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const medicineData = {
      name: formData.name,
      generic_name: formData.generic_name,
      category_id: formData.category_id || null,
      manufacturer: formData.manufacturer,
      unit_price: parseFloat(formData.unit_price),
      quantity_in_stock: parseInt(formData.quantity_in_stock),
      reorder_level: parseInt(formData.reorder_level),
      expiry_date: formData.expiry_date || null,
      batch_number: formData.batch_number,
    };

    if (editingMedicine) {
      const { error } = await supabase
        .from("medicines")
        .update(medicineData)
        .eq("id", editingMedicine.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Medicine updated successfully",
        });
        resetForm();
        fetchMedicines();
      }
    } else {
      const { error } = await supabase.from("medicines").insert([medicineData]);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Medicine added successfully",
        });
        resetForm();
        fetchMedicines();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("medicines").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Medicine deleted successfully",
      });
      fetchMedicines();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      generic_name: "",
      category_id: "",
      manufacturer: "",
      unit_price: "",
      quantity_in_stock: "",
      reorder_level: "10",
      expiry_date: "",
      batch_number: "",
    });
    setEditingMedicine(null);
    setDialogOpen(false);
  };

  const handleEdit = (medicine: Medicine) => {
    setEditingMedicine(medicine);
    setFormData({
      name: medicine.name,
      generic_name: medicine.generic_name || "",
      category_id: medicine.category_id || "",
      manufacturer: medicine.manufacturer || "",
      unit_price: medicine.unit_price.toString(),
      quantity_in_stock: medicine.quantity_in_stock.toString(),
      reorder_level: medicine.reorder_level.toString(),
      expiry_date: medicine.expiry_date || "",
      batch_number: medicine.batch_number || "",
    });
    setDialogOpen(true);
  };

  const filteredMedicines = medicines.filter(
    (medicine) =>
      medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      medicine.generic_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Inventory Management</h1>
            <p className="text-muted-foreground">Manage your medicine stock</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={resetForm}>
                <Plus className="h-4 w-4" />
                Add Medicine
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMedicine ? "Edit Medicine" : "Add New Medicine"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Medicine Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="generic_name">Generic Name</Label>
                    <Input
                      id="generic_name"
                      value={formData.generic_name}
                      onChange={(e) =>
                        setFormData({ ...formData, generic_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Manufacturer</Label>
                    <Input
                      id="manufacturer"
                      value={formData.manufacturer}
                      onChange={(e) =>
                        setFormData({ ...formData, manufacturer: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_price">Unit Price *</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      step="0.01"
                      value={formData.unit_price}
                      onChange={(e) =>
                        setFormData({ ...formData, unit_price: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity in Stock *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity_in_stock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity_in_stock: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorder_level">Reorder Level *</Label>
                    <Input
                      id="reorder_level"
                      type="number"
                      value={formData.reorder_level}
                      onChange={(e) =>
                        setFormData({ ...formData, reorder_level: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry_date">Expiry Date</Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) =>
                        setFormData({ ...formData, expiry_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="batch_number">Batch Number</Label>
                    <Input
                      id="batch_number"
                      value={formData.batch_number}
                      onChange={(e) =>
                        setFormData({ ...formData, batch_number: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingMedicine ? "Update" : "Add"} Medicine
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medicines..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Generic Name</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedicines.map((medicine) => (
                <TableRow key={medicine.id}>
                  <TableCell className="font-medium">{medicine.name}</TableCell>
                  <TableCell>{medicine.generic_name}</TableCell>
                  <TableCell>{medicine.manufacturer}</TableCell>
                  <TableCell>${medicine.unit_price.toFixed(2)}</TableCell>
                  <TableCell>{medicine.quantity_in_stock}</TableCell>
                  <TableCell>
                    {medicine.quantity_in_stock <= medicine.reorder_level ? (
                      <Badge variant="destructive">Low Stock</Badge>
                    ) : (
                      <Badge className="bg-secondary">In Stock</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(medicine)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(medicine.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
};

export default Inventory;
