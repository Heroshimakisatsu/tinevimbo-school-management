import { useState } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Search, Plus, Package, Edit, Trash2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

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

const mockInventory: InventoryItem[] = [
  {
    id: '1',
    name: 'Exercise Books A4',
    category: 'Stationery',
    quantity: 150,
    minStock: 50,
    maxStock: 300,
    unit: 'packs',
    unitCost: 12.50,
    totalValue: 1875.00,
    location: 'Stationery Room',
    supplier: 'Office Supplies Co.',
    lastRestocked: '2026-01-28',
    status: 'in-stock',
    description: 'A4 ruled exercise books for students'
  },
  {
    id: '2',
    name: 'School Uniform Shirts',
    category: 'Uniforms',
    quantity: 25,
    minStock: 30,
    maxStock: 100,
    unit: 'pieces',
    unitCost: 35.00,
    totalValue: 875.00,
    location: 'Uniform Store',
    supplier: 'Quality Uniforms Ltd',
    lastRestocked: '2026-01-15',
    status: 'low-stock',
    description: 'White school shirts for all grades'
  },
  {
    id: '3',
    name: 'Math Textbooks Grade 8',
    category: 'Books',
    quantity: 0,
    minStock: 20,
    maxStock: 50,
    unit: 'copies',
    unitCost: 45.00,
    totalValue: 0.00,
    location: 'Library',
    supplier: 'Educational Publishers',
    lastRestocked: '2025-12-10',
    status: 'out-of-stock',
    description: 'Mathematics textbooks for Grade 8 students'
  },
  {
    id: '4',
    name: 'Chalk Boxes',
    category: 'Stationery',
    quantity: 45,
    minStock: 20,
    maxStock: 80,
    unit: 'boxes',
    unitCost: 8.00,
    totalValue: 360.00,
    location: 'Stationery Room',
    supplier: 'Office Supplies Co.',
    lastRestocked: '2026-02-01',
    status: 'in-stock',
    description: 'White chalk for classroom use'
  },
  {
    id: '5',
    name: 'Lab Equipment',
    category: 'Science',
    quantity: 12,
    minStock: 10,
    maxStock: 25,
    unit: 'sets',
    unitCost: 120.00,
    totalValue: 1440.00,
    location: 'Science Lab',
    supplier: 'Science Supplies Inc',
    lastRestocked: '2026-01-20',
    status: 'in-stock',
    description: 'Complete lab equipment sets for science classes'
  },
  {
    id: '6',
    name: 'School Bags',
    category: 'Uniforms',
    quantity: 18,
    minStock: 25,
    maxStock: 60,
    unit: 'pieces',
    unitCost: 28.00,
    totalValue: 504.00,
    location: 'Uniform Store',
    supplier: 'Quality Uniforms Ltd',
    lastRestocked: '2026-01-10',
    status: 'low-stock',
    description: 'Standard school bags with school logo'
  }
];

const categories = ['All', 'Stationery', 'Uniforms', 'Books', 'Science', 'Sports', 'Cleaning'];
const locations = ['All', 'Stationery Room', 'Uniform Store', 'Library', 'Science Lab', 'Sports Room', 'Main Store'];

export function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const filteredInventory = mockInventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesLocation = selectedLocation === 'All' || item.location === selectedLocation;
    
    return matchesSearch && matchesCategory && matchesLocation;
  });

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

  const totalItems = filteredInventory.length;
  const totalValue = filteredInventory.reduce((sum, item) => sum + item.totalValue, 0);
  const lowStockItems = filteredInventory.filter(item => item.status === 'low-stock').length;
  const outOfStockItems = filteredInventory.filter(item => item.status === 'out-of-stock').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-['Space_Grotesk'] text-[#10B981]">School Inventory</h1>
          <p className="text-muted-foreground font-['Inter']">Manage school supplies, uniforms, and equipment</p>
        </div>
        <Button 
          onClick={() => setShowAddForm(true)}
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
              <p className="text-2xl font-bold font-['Space_Grotesk']">{totalItems}</p>
            </div>
            <Package className="w-8 h-8 text-[#3B82F6]" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter']">Total Value</p>
              <p className="text-2xl font-bold font-['Space_Grotesk']">${totalValue.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-[#10B981]" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter']">Low Stock</p>
              <p className="text-2xl font-bold font-['Space_Grotesk'] text-[#F59E0B]">{lowStockItems}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-[#F59E0B]" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter']">Out of Stock</p>
              <p className="text-2xl font-bold font-['Space_Grotesk'] text-[#EF4444]">{outOfStockItems}</p>
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
              {filteredInventory.map((item) => (
                <TableRow key={item.id} className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Inter']">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-muted-foreground">{item.description}</div>
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
                        onClick={() => setEditingItem(item)}
                        className="text-[#3B82F6] hover:text-[#2563EB] hover:bg-[#3B82F6]/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toast.success('Item deleted successfully')}
                        className="text-[#EF4444] hover:text-[#DC2626] hover:bg-[#EF4444]/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      {/* Add/Edit Item Modal */}
      {(showAddForm || editingItem) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-['Space_Grotesk'] mb-6">
              {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="font-['Inter']">Item Name</Label>
                <Input 
                  defaultValue={editingItem?.name}
                  placeholder="Enter item name"
                  className="font-['Inter']"
                />
              </div>
              
              <div>
                <Label className="font-['Inter']">Category</Label>
                <Select defaultValue={editingItem?.category}>
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
                  defaultValue={editingItem?.quantity}
                  placeholder="0"
                  className="font-['Inter']"
                />
              </div>
              
              <div>
                <Label className="font-['Inter']">Unit</Label>
                <Input 
                  defaultValue={editingItem?.unit}
                  placeholder="pieces, packs, boxes..."
                  className="font-['Inter']"
                />
              </div>
              
              <div>
                <Label className="font-['Inter']">Min Stock Level</Label>
                <Input 
                  type="number"
                  defaultValue={editingItem?.minStock}
                  placeholder="0"
                  className="font-['Inter']"
                />
              </div>
              
              <div>
                <Label className="font-['Inter']">Max Stock Level</Label>
                <Input 
                  type="number"
                  defaultValue={editingItem?.maxStock}
                  placeholder="0"
                  className="font-['Inter']"
                />
              </div>
              
              <div>
                <Label className="font-['Inter']">Unit Cost ($)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  defaultValue={editingItem?.unitCost}
                  placeholder="0.00"
                  className="font-['Inter']"
                />
              </div>
              
              <div>
                <Label className="font-['Inter']">Location</Label>
                <Select defaultValue={editingItem?.location}>
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
                  defaultValue={editingItem?.supplier}
                  placeholder="Supplier name"
                  className="font-['Inter']"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label className="font-['Inter']">Description</Label>
                <Input 
                  defaultValue={editingItem?.description}
                  placeholder="Item description (optional)"
                  className="font-['Inter']"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
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
                onClick={() => {
                  toast.success(editingItem ? 'Item updated successfully' : 'Item added successfully');
                  setShowAddForm(false);
                  setEditingItem(null);
                }}
                className="bg-[#10B981] hover:bg-[#059669] text-white font-['Inter']"
              >
                {editingItem ? 'Update Item' : 'Add Item'}
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
