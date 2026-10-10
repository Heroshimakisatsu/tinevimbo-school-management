import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Plus, Edit, Package, DollarSign, TrendingUp, AlertCircle, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../utils/api';

interface UniformSize {
  id: number;
  size: string;
  quantity: number;
}

interface UniformItem {
  id: string;
  name: string;
  category: 'ecd-grade2' | 'grade3-7' | 'form1-4' | 'form5-6' | 'primary' | 'secondary';
  price: number;
  sizes: UniformSize[];
  totalStock: number;
  description?: string;
  color?: string;
}

export function UniformInventory() {
  const [uniforms, setUniforms] = useState<UniformItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUniform, setEditingUniform] = useState<UniformItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'ecd-grade2' | 'grade3-7' | 'form1-4' | 'form5-6'>('ecd-grade2');

  // Table editing state
  const [editingTablePrice, setEditingTablePrice] = useState<string | null>(null);
  const [editingTableQuantity, setEditingTableQuantity] = useState<string | null>(null);
  const [tempTablePrice, setTempTablePrice] = useState<string>('');
  const [tempTableQuantity, setTempTableQuantity] = useState<string>('');

  // Add Form Bindings
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'ecd-grade2' | 'grade3-7' | 'form1-4' | 'form5-6'>('ecd-grade2');
  const [newPrice, setNewPrice] = useState('');
  const [newSizesText, setNewSizesText] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Edit Form Bindings
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<'ecd-grade2' | 'grade3-7' | 'form1-4' | 'form5-6'>('ecd-grade2');
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [addingSize, setAddingSize] = useState(false);
  const [newSizeData, setNewSizeData] = useState({ size: '', quantity: '' });

  const fetchUniforms = async () => {
    try {
      setLoading(true);

      // Backend returns { data: UniformItem[], count: number }
      const response = await api.get<{ data: any[]; count: number }>('/uniforms');
      const list = response.data;  // ← extract the array

      const mapped = list.map((u: any) => ({
        id:          String(u.id),
        name:        u.name,
        category:    u.category,
        price:       u.price,
        sizes:       (u.sizes || []).map((s: any) => ({
          id:       s.id,
          size:     s.size_label,
          quantity: s.quantity,
        })),
        totalStock:  u.total_stock || 0,
        description: u.description || '',
        color:       u.color || 'white',
      }));

      setUniforms(mapped);
    } catch (error: any) {
      toast.error('Failed to load uniform inventory', {
        description: error.message || 'Make sure the backend is running.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniforms();
  }, []);

  // Calculate statistics
  const totalItems = uniforms.length;
  const totalValue = uniforms.reduce((sum, item) => sum + (item.price * item.totalStock), 0);
  const primaryItems = uniforms.filter(item => item.category === 'ecd-grade2' || item.category === 'grade3-7' || item.category === 'primary').length;
  const secondaryItems = uniforms.filter(item => item.category === 'form1-4' || item.category === 'form5-6' || item.category === 'secondary').length;
  const lowStockItems = uniforms.filter(item => 
    item.sizes.some(size => size.quantity < 5)
  ).length;

  const getStockLevelBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge className="bg-[#EF4444] text-white">Out of Stock</Badge>;
    } else if (stock < 5) {
      return <Badge className="bg-[#F59E0B] text-white">Low Stock</Badge>;
    } else if (stock < 20) {
      return <Badge className="bg-[#3B82F6] text-white">Medium Stock</Badge>;
    } else {
      return <Badge className="bg-[#10B981] text-white">Good Stock</Badge>;
    }
  };

  const handleAddUniform = async () => {
    if (!newName.trim() || !newPrice.trim()) {
      toast.error('Please enter name and price');
      return;
    }

    try {
      // Backend returns { data: { id, name, ... } }
      const res = await api.post<{ data: any }>('/uniforms', {
        name:              newName,
        category:          newCategory,
        price:             parseFloat(newPrice) || 0,
        description:       newDescription || '',
        applicable_gender: 'unisex',
        color:             'white',
      });

      const newUniformId = res.data?.id;  // ← extract from res.data

      if (newUniformId) {
        // Insert initial sizes if provided (format: "S:10, M:15, L:8")
        if (newSizesText.trim()) {
          const sizesList = newSizesText
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

          for (const s of sizesList) {
            const parts = s.split(':');
            if (parts.length === 2) {
              const label = parts[0].trim();
              const qty   = parseInt(parts[1].trim()) || 0;
              await api.post(`/uniforms/${newUniformId}/sizes`, {
                size_label: label,
                quantity:   qty,
              });
            }
          }
        }

        toast.success('Uniform item added successfully!');

        // Reset form
        setNewName('');
        setNewPrice('');
        setNewSizesText('');
        setNewDescription('');
        setShowAddForm(false);

        await fetchUniforms();
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to add uniform item');
    }
  };

  const handlePriceUpdate = async (uniformId: string, newPrice: number) => {
    try {
      await api.patch(`/uniforms/${uniformId}`, { price: newPrice });
      setUniforms(prev => prev.map(item => 
        item.id === uniformId ? { ...item, price: newPrice } : item
      ));
      toast.success('Price updated successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update price');
    }
  };

  const handleSizeUpdate = async (uniformId: string, sizeId: number, newQuantity: number) => {
    if (newQuantity < 0) {
      toast.error('Quantity cannot be negative');
      return;
    }

    try {
      await api.patch(`/uniforms/${uniformId}/sizes/${sizeId}`, {
        quantity: newQuantity,
      });

      // Update local state immediately (optimistic update)
      setUniforms(prev =>
        prev.map(item => {
          if (item.id === uniformId) {
            const updatedSizes = item.sizes.map((sz: any) =>
              sz.id === sizeId ? { ...sz, quantity: newQuantity } : sz
            );
            const newTotalStock = updatedSizes.reduce(
              (sum: number, sz: any) => sum + sz.quantity, 0
            );
            return { ...item, sizes: updatedSizes, totalStock: newTotalStock };
          }
          return item;
        })
      );
      toast.success('Stock quantity updated!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update stock quantity');
    }
  };

  // Table editing handlers
  const handleTablePriceEdit = (uniformId: string) => {
    const uniform = uniforms.find(u => u.id === uniformId);
    if (uniform) {
      setEditingTablePrice(uniformId);
      setTempTablePrice(uniform.price.toString());
    }
  };

  const handleTablePriceSave = (uniformId: string) => {
    const newPrice = parseFloat(tempTablePrice);
    if (!isNaN(newPrice) && newPrice >= 0) {
      handlePriceUpdate(uniformId, newPrice);
    }
    setEditingTablePrice(null);
    setTempTablePrice('');
  };

  const handleTableQuantityEdit = (uniformId: string, sizeId: number) => {
    const uniform = uniforms.find(u => u.id === uniformId);
    const size = uniform?.sizes.find(s => s.id === sizeId);
    if (size) {
      setEditingTableQuantity(`${uniformId}-${sizeId}`);
      setTempTableQuantity(size.quantity.toString());
    }
  };

  const handleTableQuantitySave = (uniformId: string, sizeId: number) => {
    const newQuantity = parseInt(tempTableQuantity);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      handleSizeUpdate(uniformId, sizeId, newQuantity);
    }
    setEditingTableQuantity(null);
    setTempTableQuantity('');
  };

  const handleEditUniform = (uniform: UniformItem) => {
    setEditingUniform(uniform);
    setEditName(uniform.name);
    setEditCategory(uniform.category);
    setEditPrice(uniform.price.toString());
    setEditDescription(uniform.description || '');
    setShowEditForm(true);
  };

  const handleEditUniformSave = async () => {
    if (!editName.trim() || !editPrice.trim()) {
      toast.error('Please enter name and price');
      return;
    }

    try {
      await api.patch(`/uniforms/${editingUniform?.id}`, {
        name: editName,
        category: editCategory,
        price: parseFloat(editPrice) || 0,
        description: editDescription || '',
      });

      toast.success('Uniform item updated successfully!');
      setShowEditForm(false);
      setEditingUniform(null);
      await fetchUniforms();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update uniform item');
    }
  };

  const handleEditAddSize = async () => {
    if (!newSizeData.size || !newSizeData.quantity) {
      toast.error('Please enter size label and quantity');
      return;
    }

    const qty = parseInt(newSizeData.quantity);
    if (isNaN(qty) || qty < 0) {
      toast.error('Quantity must be a valid positive number');
      return;
    }

    try {
      await api.post(`/uniforms/${editingUniform?.id}/sizes`, {
        size_label: newSizeData.size,
        quantity: qty,
      });

      await fetchUniforms();
      
      // Update the editing uniform with the new data
      if (editingUniform) {
        const updatedUniforms = await api.get<{ data: any[]; count: number }>('/uniforms');
        const updatedItem = updatedUniforms.data.find((u: any) => u.id === editingUniform.id);
        if (updatedItem) {
          setEditingUniform({
            ...editingUniform,
            sizes: (updatedItem.sizes || []).map((s: any) => ({
              id: s.id,
              size: s.size_label,
              quantity: s.quantity,
            })),
            totalStock: updatedItem.total_stock || 0,
          });
        }
      }

      setNewSizeData({ size: '', quantity: '' });
      setAddingSize(false);
      toast.success('Size added successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add size');
    }
  };

  const handleEditUpdateSize = async (sizeId: number, newQuantity: number) => {
    if (newQuantity < 0) {
      toast.error('Quantity cannot be negative');
      return;
    }

    try {
      await api.patch(`/uniforms/${editingUniform?.id}/sizes/${sizeId}`, {
        quantity: newQuantity,
      });

      await fetchUniforms();
      
      // Update the editing uniform with the new data
      if (editingUniform) {
        const updatedUniforms = await api.get<{ data: any[]; count: number }>('/uniforms');
        const updatedItem = updatedUniforms.data.find((u: any) => u.id === editingUniform.id);
        if (updatedItem) {
          setEditingUniform({
            ...editingUniform,
            sizes: (updatedItem.sizes || []).map((s: any) => ({
              id: s.id,
              size: s.size_label,
              quantity: s.quantity,
            })),
            totalStock: updatedItem.total_stock || 0,
          });
        }
      }

      toast.success('Stock quantity updated!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update stock quantity');
    }
  };

  const handleEditRemoveSize = async (sizeId: number) => {
    try {
      await api.delete(`/uniforms/${editingUniform?.id}/sizes/${sizeId}`);

      await fetchUniforms();
      
      // Update the editing uniform with the new data
      if (editingUniform) {
        const updatedUniforms = await api.get<{ data: any[]; count: number }>('/uniforms');
        const updatedItem = updatedUniforms.data.find((u: any) => u.id === editingUniform.id);
        if (updatedItem) {
          setEditingUniform({
            ...editingUniform,
            sizes: (updatedItem.sizes || []).map((s: any) => ({
              id: s.id,
              size: s.size_label,
              quantity: s.quantity,
            })),
            totalStock: updatedItem.total_stock || 0,
          });
        }
      }

      toast.success('Size removed successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove size');
    }
  };

  const handleCategoryChange = (category: 'ecd-grade2' | 'grade3-7' | 'form1-4' | 'form5-6') => {
    setSelectedCategory(category);
    
    // Scroll to navigation buttons section
    const navButtonsSection = document.getElementById('primary-school-section');
    if (navButtonsSection) {
      const navHeight = 100; // Offset from top
      const elementPosition = navButtonsSection.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: elementPosition - navHeight, behavior: 'smooth' });
    }
  };



  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#10B981]" />
        <p className="text-sm text-muted-foreground font-['Inter']">Loading uniform inventory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-gray-50 dark:bg-transparent min-h-screen pt-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-['Space_Grotesk'] text-[#10B981]">Uniform Inventory</h1>
        </div>
      </div>

      {/* Add New Uniform Section */}
      <GlassCard className="border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-['Space_Grotesk']">Add New Uniform</h2>
            {showAddForm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
                className="text-[#EF4444] hover:text-[#DC2626]"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {!showAddForm ? (
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-[#10B981] hover:bg-[#059669] text-white rounded-[20px] font-['Inter'] cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Uniform Item
            </Button>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="font-['Inter']">Uniform Name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., School Blazer"
                  className="font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                />
              </div>
              
              <div>
                <Label className="font-['Inter']">Category</Label>
                <Select 
                  value={newCategory} 
                  onValueChange={(val: any) => setNewCategory(val)}
                >
                  <SelectTrigger className="font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ecd-grade2" className="font-['Inter']">ECD to Grade 2</SelectItem>
                    <SelectItem value="grade3-7" className="font-['Inter']">Grade 3 to Grade 7</SelectItem>
                    <SelectItem value="form1-4" className="font-['Inter']">Form 1 to Form 4</SelectItem>
                    <SelectItem value="form5-6" className="font-['Inter']">Form 5 to Form 6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="font-['Inter']">Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="0.00"
                  className="font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                />
              </div>
              
              <div>
                <Label className="font-['Inter']">Initial Sizes</Label>
                <Input
                  value={newSizesText}
                  onChange={(e) => setNewSizesText(e.target.value)}
                  placeholder="e.g., S:10, M:15, L:8"
                  className="font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                />
              </div>
              
              <div className="md:col-span-2 lg:col-span-4">
                <Label className="font-['Inter']">Description</Label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description"
                  className="font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                />
              </div>
              
              <div className="md:col-span-2 lg:col-span-4 flex gap-3">
                <Button
                  onClick={handleAddUniform}
                  className="bg-[#10B981] hover:bg-[#059669] text-white rounded-[20px] font-['Inter'] cursor-pointer"
                >
                  Add Uniform
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  className="font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Primary School Section */}
      <div id="primary-school-section" className="space-y-8">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => handleCategoryChange('ecd-grade2')}
            className={`font-['Inter'] transition-colors cursor-pointer ${
              selectedCategory === 'ecd-grade2' 
                ? 'bg-[#3B82F6] hover:bg-[#2563EB] text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
            }`}
          >
            ECD to Grade 2
          </Button>
          <Button 
            onClick={() => handleCategoryChange('grade3-7')}
            className={`font-['Inter'] transition-colors cursor-pointer ${
              selectedCategory === 'grade3-7' 
                ? 'bg-[#3B82F6] hover:bg-[#2563EB] text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
            }`}
          >
            Grade 3 to 7
          </Button>
          <Button 
            onClick={() => handleCategoryChange('form1-4')}
            className={`font-['Inter'] transition-colors cursor-pointer ${
              selectedCategory === 'form1-4' 
                ? 'bg-[#10B981] hover:bg-[#059669] text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
            }`}
          >
            Form 1 to Form 4
          </Button>
          <Button 
            onClick={() => handleCategoryChange('form5-6')}
            className={`font-['Inter'] transition-colors cursor-pointer ${
              selectedCategory === 'form5-6' 
                ? 'bg-[#10B981] hover:bg-[#059669] text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
            }`}
          >
            Form 5 to Form 6
          </Button>
        </div>

        {/* Single Dynamic Inventory Table */}
        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-['Space_Grotesk'] mb-4">
            {selectedCategory === 'ecd-grade2' && 'ECD to Grade 2 - Inventory Summary'}
            {selectedCategory === 'grade3-7' && 'Grade 3 to 7 - Inventory Summary'}
            {selectedCategory === 'form1-4' && 'Form 1 to Form 4 - Inventory Summary'}
            {selectedCategory === 'form5-6' && 'Form 5 to Form 6 - Inventory Summary'}
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Uniform Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {uniforms.filter(u => u.category === selectedCategory).map((uniform, uniformIndex) => {
                    const isEvenRow = uniformIndex % 2 === 0;
                    return (
                      <tr key={uniform.id} className={`${
                        isEvenRow 
                          ? 'bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/20' 
                          : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                      } transition-colors`}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{uniform.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {editingTablePrice === uniform.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={tempTablePrice}
                                onChange={(e) => setTempTablePrice(e.target.value)}
                                onBlur={() => handleTablePriceSave(uniform.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleTablePriceSave(uniform.id);
                                  if (e.key === 'Escape') {
                                    setEditingTablePrice(null);
                                    setTempTablePrice('');
                                  }
                                }}
                                className="w-20 h-6 text-sm font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <span 
                              className="cursor-pointer hover:text-[#3B82F6] hover:underline"
                              onClick={() => handleTablePriceEdit(uniform.id)}
                            >
                              ${uniform.price.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {uniform.sizes.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <div className="space-y-1">
                              {uniform.sizes.map((size) => (
                                <span 
                                  key={size.id} 
                                  className={`text-xs px-2 py-1 rounded block ${
                                    size.quantity < 5 
                                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100' 
                                      : 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100'
                                  }`}
                                >
                                  {size.size}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {uniform.sizes.length === 0 ? (
                            <span className="text-muted-foreground">0</span>
                          ) : (
                            <div className="space-y-1">
                              {uniform.sizes.map((size) => (
                                <div 
                                  key={size.id} 
                                  className={`text-xs px-2 py-1 rounded cursor-pointer hover:text-[#3B82F6] hover:underline ${
                                    editingTableQuantity === `${uniform.id}-${size.id}` 
                                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' 
                                      : size.quantity < 5 
                                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100' 
                                        : 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100'
                                  }`}
                                  onClick={() => handleTableQuantityEdit(uniform.id, size.id)}
                                >
                                  {editingTableQuantity === `${uniform.id}-${size.id}` ? (
                                    <Input
                                      type="number"
                                      value={tempTableQuantity}
                                      onChange={(e) => setTempTableQuantity(e.target.value)}
                                      onBlur={() => handleTableQuantitySave(uniform.id, size.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleTableQuantitySave(uniform.id, size.id);
                                        if (e.key === 'Escape') {
                                          setEditingTableQuantity(null);
                                          setTempTableQuantity('');
                                        }
                                      }}
                                      className="w-12 h-5 text-xs font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                                      autoFocus
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    size.quantity
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{uniform.totalStock}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUniform(uniform)}
                            className="h-8 w-8 p-0 text-[#3B82F6] hover:text-[#2563EB]"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {uniforms.filter(u => u.category === selectedCategory).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-sm text-center text-muted-foreground">No records.</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-t-2 border-gray-200 dark:border-gray-600">
                    <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Total Items in {selectedCategory === 'ecd-grade2' && 'ECD to Grade 2'}
                      {selectedCategory === 'grade3-7' && 'Grade 3 to 7'}
                      {selectedCategory === 'form1-4' && 'Form 1 to Form 4'}
                      {selectedCategory === 'form5-6' && 'Form 5 to Form 6'}:
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {uniforms.filter(u => u.category === selectedCategory).reduce((sum, uniform) => sum + uniform.totalStock, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Uniform Modal */}
      {showEditForm && editingUniform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="backdrop-blur-md rounded-[20px] p-4 md:p-5 dark:bg-white/5 dark:border dark:border-white/10 bg-white border border-gray-200 shadow-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-['Space_Grotesk']">Edit Uniform Item</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEditForm(false)}
                className="text-[#EF4444] hover:text-[#DC2626]"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="font-['Inter']">Uniform Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g., School Blazer"
                  className="font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                />
              </div>
              
              <div>
                <Label className="font-['Inter']">Category</Label>
                <Select 
                  value={editCategory} 
                  onValueChange={(val: any) => setEditCategory(val)}
                >
                  <SelectTrigger className="font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ecd-grade2" className="font-['Inter']">ECD to Grade 2</SelectItem>
                    <SelectItem value="grade3-7" className="font-['Inter']">Grade 3 to Grade 7</SelectItem>
                    <SelectItem value="form1-4" className="font-['Inter']">Form 1 to Form 4</SelectItem>
                    <SelectItem value="form5-6" className="font-['Inter']">Form 5 to Form 6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="font-['Inter']">Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="0.00"
                  className="font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label className="font-['Inter']">Description</Label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional description"
                  className="font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                />
              </div>
            </div>

            {/* Size Management Section */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between mb-4">
                <Label className="font-['Inter'] text-base font-semibold">Size Management</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddingSize(!addingSize)}
                  className="h-8 text-[#3B82F6] hover:text-[#2563EB] text-xs font-['Inter']"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {addingSize ? 'Cancel' : 'Add Size'}
                </Button>
              </div>
              
              {addingSize && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={newSizeData.size}
                      onChange={(e) => setNewSizeData({...newSizeData, size: e.target.value})}
                      placeholder="Size name"
                      className="h-9 text-sm font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                    />
                    <Input
                      type="number"
                      value={newSizeData.quantity}
                      onChange={(e) => setNewSizeData({...newSizeData, quantity: e.target.value})}
                      placeholder="Quantity"
                      className="h-9 text-sm font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                    />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={handleEditAddSize}
                      size="sm"
                      className="h-8 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-['Inter']"
                    >
                      Add
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAddingSize(false);
                        setNewSizeData({ size: '', quantity: '' });
                      }}
                      className="h-8 text-xs font-['Inter']"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {editingUniform?.sizes.map((size) => (
                  <div key={size.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-['Inter']">
                          {size.size}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={size.quantity}
                          onChange={(e) => handleEditUpdateSize(size.id, parseInt(e.target.value) || 0)}
                          className={`w-16 h-7 text-xs font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 ${
                            size.quantity < 5 ? 'border-[#F59E0B] bg-[#F59E0B]/10' : ''
                          }`}
                        />
                        <span className="text-xs text-muted-foreground font-['Inter']">pcs</span>
                        {size.quantity < 5 && (
                          <span className="text-xs text-[#F59E0B] font-['Inter']">Low Stock</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditRemoveSize(size.id)}
                      className="h-7 w-7 p-0 text-[#EF4444] hover:text-[#DC2626]"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {editingUniform?.sizes.length === 0 && (
                  <p className="text-sm text-muted-foreground font-['Inter'] text-center py-4">No sizes defined for this item</p>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-['Inter']">Total Stock:</span>
                  <span className="font-['Space_Grotesk'] font-bold text-gray-900 dark:text-gray-100">{editingUniform?.totalStock} pieces</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowEditForm(false)}
                className="font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditUniformSave}
                className="bg-[#10B981] hover:bg-[#059669] text-white font-['Inter']"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
