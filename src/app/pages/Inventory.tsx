import { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Search, Plus, Package, Edit, Trash2, AlertCircle, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../utils/api';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  unit: string;
  unitCost: number;
  totalValue: number;
  location: string;
  supplier: string;
  lastRestocked: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  description?: string;
}

const categories = ['All', 'Stationery', 'Uniforms', 'Books', 'Science', 'Sports', 'Cleaning', 'Food', 'Furniture', 'Equipment'];
const locations = ['All', 'Storeroom', 'Office', 'Kitchen', 'Classroom', 'Sports Room', 'Library', 'Science Lab', 'Main Store'];

export function Inventory() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState({
    total_items: 0,
    total_value: 0,
    low_stock: 0,
    out_of_stock: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [formFields, setFormFields] = useState({
    name: '',
    category: 'Stationery',
    quantity: '0',
    unit: 'pieces',
    minStock: '5',
    maxStock: '100',
    unitCost: '0.00',
    location: 'Storeroom',
    supplier: '',
    description: ''
  });

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const queryParams: any = {};
      if (searchTerm.trim()) queryParams.q = searchTerm.trim();
      if (selectedCategory !== 'All') queryParams.category = selectedCategory;
      if (selectedLocation !== 'All') queryParams.location = selectedLocation;

      const [inventoryList, statsData] = await Promise.all([
        api.get<any[]>('/inventory', queryParams),
        api.get<any>('/inventory/stats')
      ]);

      const mapped = inventoryList.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        minStock: item.min_stock,
        maxStock: item.max_stock,
        unit: item.unit,
        unitCost: item.unit_cost,
        totalValue: item.quantity * item.unit_cost,
        location: item.location,
        supplier: item.supplier || '',
        lastRestocked: item.last_restocked || '',
        status: item.status,
        description: item.description || '',
      }));

      setItems(mapped);
      setStats(statsData || { total_items: 0, total_value: 0, low_stock: 0, out_of_stock: 0 });
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast.error('Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [searchTerm, selectedCategory, selectedLocation]);

  const handleStartAdd = () => {
    setEditingItem(null);
    setFormFields({
      name: '',
      category: 'Stationery',
      quantity: '0',
      unit: 'pieces',
      minStock: '5',
      maxStock: '100',
      unitCost: '0.00',
      location: 'Storeroom',
      supplier: '',
      description: ''
    });
    setShowAddForm(true);
  };

  const handleStartEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormFields({
      name: item.name,
      category: item.category,
      quantity: String(item.quantity),
      unit: item.unit,
      minStock: String(item.minStock),
      maxStock: String(item.maxStock),
      unitCost: String(item.unitCost),
      location: item.location,
      supplier: item.supplier,
      description: item.description || ''
    });
    setShowAddForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/inventory/${id}`);
      toast.success('Item deleted successfully');
      fetchInventory();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formFields.name,
        category: formFields.category,
        quantity: parseInt(formFields.quantity) || 0,
        min_stock: parseInt(formFields.minStock) || 0,
        max_stock: parseInt(formFields.maxStock) || 0,
        unit: formFields.unit,
        unit_cost: parseFloat(formFields.unitCost) || 0,
        location: formFields.location,
        supplier: formFields.supplier || null,
        description: formFields.description || null,
        last_restocked: new Date().toISOString().split('T')[0]
      };

      if (editingItem) {
        await api.patch(`/inventory/${editingItem.id}`, payload);
        toast.success('Item updated successfully');
      } else {
        await api.post('/inventory', payload);
        toast.success('Item added successfully');
      }

      setShowAddForm(false);
      setEditingItem(null);
      fetchInventory();
    } catch (error: any) {
      toast.error('Failed to save item', {
        description: error.message || 'Error occurred.'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in-stock':
        return <Badge className="bg-[#10B981] text-white">In Stock</Badge>;
      case 'low-stock':
        return <Badge className="bg-[#F59E0B] text-white">Low Stock</Badge>;
      case 'out-of-stock':
        return <Badge className="bg-[#EF4444] text-white">Out of Stock</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-['Space_Grotesk'] text-[#10B981]">School Inventory</h1>
        </div>
        <Button 
          onClick={handleStartAdd}
          className="bg-[#10B981] hover:bg-[#059669] text-white rounded-[20px] font-['Inter']"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter']">Total Items</p>
              <p className="text-2xl font-bold font-['Space_Grotesk']">{stats.total_items}</p>
            </div>
            <Package className="w-8 h-8 text-[#3B82F6]" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter']">Total Value</p>
              <p className="text-2xl font-bold font-['Space_Grotesk']">${(stats.total_value || 0).toFixed(2)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-[#10B981]" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter']">Low Stock</p>
              <p className="text-2xl font-bold font-['Space_Grotesk'] text-[#F59E0B]">{stats.low_stock}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-[#F59E0B]" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter']">Out of Stock</p>
              <p className="text-2xl font-bold font-['Space_Grotesk'] text-[#EF4444]">{stats.out_of_stock}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-[#EF4444]" />
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search inventory items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 font-['Inter']"
              />
            </div>
          </div>
          
          <div className="w-full md:w-48">
            <Label className="font-['Inter']">Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="font-['Inter']">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category} className="font-['Inter']">
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-48">
            <Label className="font-['Inter']">Location</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="font-['Inter']">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locations.map(location => (
                  <SelectItem key={location} value={location} className="font-['Inter']">
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      {/* Inventory Table */}
      <GlassCard>
        <div className="overflow-x-auto">
          {loading && items.length === 0 ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-[#10B981]" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableHead className="font-['Inter']">Item Name</TableHead>
                  <TableHead className="font-['Inter']">Category</TableHead>
                  <TableHead className="font-['Inter'] text-right">Quantity</TableHead>
                  <TableHead className="font-['Inter'] text-right">Min/Max</TableHead>
                  <TableHead className="font-['Inter'] text-right">Unit Cost</TableHead>
                  <TableHead className="font-['Inter'] text-right">Total Value</TableHead>
                  <TableHead className="font-['Inter']">Location</TableHead>
                  <TableHead className="font-['Inter']">Status</TableHead>
                  <TableHead className="font-['Inter'] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                    <TableCell className="font-['Inter']">
                      <div>
                        <div className="font-medium text-zinc-950 dark:text-zinc-50">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-['Inter']">{item.category}</TableCell>
                    <TableCell className="font-['Space_Grotesk'] text-right">{item.quantity} {item.unit}</TableCell>
                    <TableCell className="font-['Inter'] text-right">
                      {item.minStock}/{item.maxStock}
                    </TableCell>
                    <TableCell className="font-['Space_Grotesk'] text-right">${item.unitCost.toFixed(2)}</TableCell>
                    <TableCell className="font-['Space_Grotesk'] text-right">${item.totalValue.toFixed(2)}</TableCell>
                    <TableCell className="font-['Inter']">{item.location}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(item)}
                          className="text-[#3B82F6] hover:text-[#2563EB] hover:bg-[#3B82F6]/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="text-[#EF4444] hover:text-[#DC2626] hover:bg-[#EF4444]/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4 text-muted-foreground font-['Inter']">
                      No inventory items found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </GlassCard>

      {/* Add/Edit Item Modal */}
      {(showAddForm || editingItem) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-['Space_Grotesk'] mb-6">
              {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
            </h2>
            
            <form onSubmit={handleSave}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-['Inter']">Item Name</Label>
                  <Input 
                    value={formFields.name}
                    onChange={(e) => setFormFields({ ...formFields, name: e.target.value })}
                    placeholder="Enter item name"
                    className="font-['Inter']"
                    required
                  />
                </div>
                
                <div>
                  <Label className="font-['Inter']">Category</Label>
                  <Select 
                    value={formFields.category} 
                    onValueChange={(value) => setFormFields({ ...formFields, category: value })}
                  >
                    <SelectTrigger className="font-['Inter']">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.slice(1).map(category => (
                        <SelectItem key={category} value={category} className="font-['Inter']">
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="font-['Inter']">Quantity</Label>
                  <Input 
                    type="number"
                    value={formFields.quantity}
                    onChange={(e) => setFormFields({ ...formFields, quantity: e.target.value })}
                    placeholder="0"
                    className="font-['Inter']"
                    required
                  />
                </div>
                
                <div>
                  <Label className="font-['Inter']">Unit</Label>
                  <Input 
                    value={formFields.unit}
                    onChange={(e) => setFormFields({ ...formFields, unit: e.target.value })}
                    placeholder="pieces, packs, boxes..."
                    className="font-['Inter']"
                    required
                  />
                </div>
                
                <div>
                  <Label className="font-['Inter']">Min Stock Level</Label>
                  <Input 
                    type="number"
                    value={formFields.minStock}
                    onChange={(e) => setFormFields({ ...formFields, minStock: e.target.value })}
                    placeholder="5"
                    className="font-['Inter']"
                    required
                  />
                </div>
                
                <div>
                  <Label className="font-['Inter']">Max Stock Level</Label>
                  <Input 
                    type="number"
                    value={formFields.maxStock}
                    onChange={(e) => setFormFields({ ...formFields, maxStock: e.target.value })}
                    placeholder="100"
                    className="font-['Inter']"
                    required
                  />
                </div>
                
                <div>
                  <Label className="font-['Inter']">Unit Cost ($)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={formFields.unitCost}
                    onChange={(e) => setFormFields({ ...formFields, unitCost: e.target.value })}
                    placeholder="0.00"
                    className="font-['Inter']"
                    required
                  />
                </div>
                
                <div>
                  <Label className="font-['Inter']">Location</Label>
                  <Select 
                    value={formFields.location} 
                    onValueChange={(value) => setFormFields({ ...formFields, location: value })}
                  >
                    <SelectTrigger className="font-['Inter']">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.slice(1).map(location => (
                        <SelectItem key={location} value={location} className="font-['Inter']">
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="font-['Inter']">Supplier</Label>
                  <Input 
                    value={formFields.supplier}
                    onChange={(e) => setFormFields({ ...formFields, supplier: e.target.value })}
                    placeholder="Supplier name"
                    className="font-['Inter']"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label className="font-['Inter']">Description</Label>
                  <Input 
                    value={formFields.description}
                    onChange={(e) => setFormFields({ ...formFields, description: e.target.value })}
                    placeholder="Item description (optional)"
                    className="font-['Inter']"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingItem(null);
                  }}
                  className="font-['Inter']"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#10B981] hover:bg-[#059669] text-white font-['Inter']"
                >
                  {editingItem ? 'Update Item' : 'Add Item'}
                </Button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
