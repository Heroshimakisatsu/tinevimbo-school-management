import React, { useState, useRef, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Plus, Edit, Package, DollarSign, TrendingUp, AlertCircle, X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface UniformSize {
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

const initialInventory: UniformItem[] = [
  // Secondary School - Form 1 to Form 4
  {
    id: '1',
    name: 'School Blazer',
    category: 'form1-4',
    price: 30.00,
    sizes: [
      { size: 'S (28-30)', quantity: 8 },
      { size: 'M (32-34)', quantity: 12 },
      { size: 'L (36-38)', quantity: 6 },
      { size: 'XL (40-42)', quantity: 4 }
    ],
    totalStock: 30,
    description: 'Green school blazer with school crest'
  },
  {
    id: '2',
    name: 'Tracksuit Set',
    category: 'form1-4',
    price: 25.00,
    sizes: [
      { size: 'S (28-30)', quantity: 10 },
      { size: 'M (32-34)', quantity: 15 },
      { size: 'L (36-38)', quantity: 8 },
      { size: 'XL (40-42)', quantity: 7 }
    ],
    totalStock: 40,
    description: 'Green tracksuit for physical education'
  },
  {
    id: '3',
    name: 'Boys Uniform Trousers',
    category: 'form1-4',
    price: 10.00,
    sizes: [
      { size: '28', quantity: 15 },
      { size: '30', quantity: 20 },
      { size: '32', quantity: 18 },
      { size: '34', quantity: 12 },
      { size: '36', quantity: 8 }
    ],
    totalStock: 73,
    description: 'Black school trousers'
  },
  {
    id: '4',
    name: 'School Shirt',
    category: 'form1-4',
    price: 8.00,
    sizes: [
      { size: 'S', quantity: 25 },
      { size: 'M', quantity: 30 },
      { size: 'L', quantity: 20 },
      { size: 'XL', quantity: 15 }
    ],
    totalStock: 90,
    description: 'White school shirt'
  },
  {
    id: '31',
    name: 'Jersey',
    category: 'form1-4',
    price: 15.00,
    sizes: [
      { size: 'S', quantity: 20 },
      { size: 'M', quantity: 25 },
      { size: 'L', quantity: 18 },
      { size: 'XL', quantity: 12 }
    ],
    totalStock: 75,
    description: 'Green school jersey for Form 1-4 students'
  },
  {
    id: '32',
    name: 'Cap',
    category: 'form1-4',
    price: 5.00,
    sizes: [
      { size: 'One Size', quantity: 50 }
    ],
    totalStock: 50,
    description: 'School cap for Form 1-4 students'
  },
  {
    id: '33',
    name: 'Sun Hat',
    category: 'form1-4',
    price: 6.00,
    sizes: [
      { size: 'Small', quantity: 25 },
      { size: 'Medium', quantity: 30 },
      { size: 'Large', quantity: 20 }
    ],
    totalStock: 75,
    description: 'School sun hat for Form 1-4 students'
  },
  {
    id: '34',
    name: 'Socks',
    category: 'form1-4',
    price: 3.00,
    sizes: [
      { size: 'Small', quantity: 40 },
      { size: 'Medium', quantity: 50 },
      { size: 'Large', quantity: 35 }
    ],
    totalStock: 125,
    description: 'Black school socks for Form 1-4 students'
  },
  {
    id: '35',
    name: 'Sports Wear Short',
    category: 'form1-4',
    price: 8.00,
    sizes: [
      { size: 'S', quantity: 22 },
      { size: 'M', quantity: 28 },
      { size: 'L', quantity: 20 },
      { size: 'XL', quantity: 15 }
    ],
    totalStock: 85,
    description: 'Green sports shorts for Form 1-4 students'
  },
  {
    id: '36',
    name: 'Sports Wear T-Shirt',
    category: 'form1-4',
    price: 9.00,
    sizes: [
      { size: 'S', quantity: 25 },
      { size: 'M', quantity: 30 },
      { size: 'L', quantity: 22 },
      { size: 'XL', quantity: 18 }
    ],
    totalStock: 95,
    description: 'Green sports t-shirt for Form 1-4 students'
  },
  {
    id: '37',
    name: 'Tie',
    category: 'form1-4',
    price: 4.00,
    sizes: [
      { size: 'One Size', quantity: 60 }
    ],
    totalStock: 60,
    description: 'School tie for Form 1-4 students'
  },
  {
    id: '38',
    name: 'Girls Skirt',
    category: 'form1-4',
    price: 12.00,
    sizes: [
      { size: '24', quantity: 15 },
      { size: '26', quantity: 20 },
      { size: '28', quantity: 18 },
      { size: '30', quantity: 12 }
    ],
    totalStock: 65,
    description: 'Navy blue skirt for Form 1-4 girls'
  },
  // Secondary School - Form 5 to Form 6
  {
    id: '21',
    name: 'Sports ware T-Shirt',
    category: 'form5-6',
    price: 7.50,
    sizes: [
      { size: 'XS', quantity: 15 },
      { size: 'S', quantity: 20 },
      { size: 'M', quantity: 25 },
      { size: 'L', quantity: 18 },
      { size: 'XL', quantity: 12 }
    ],
    totalStock: 90,
    description: 'Green sports t-shirt for secondary students'
  },
  {
    id: '22',
    name: 'Sports ware short',
    category: 'form5-6',
    price: 7.50,
    sizes: [
      { size: 'XS', quantity: 12 },
      { size: 'S', quantity: 18 },
      { size: 'M', quantity: 22 },
      { size: 'L', quantity: 15 },
      { size: 'XL', quantity: 10 }
    ],
    totalStock: 77,
    description: 'Green sports shorts for secondary students'
  },
  // Primary School - ECD to Grade 2
  {
    id: '5',
    name: 'ECD to Grade 2 Dress',
    category: 'ecd-grade2',
    price: 10.00,
    sizes: [
      { size: '3-4 years', quantity: 12 },
      { size: '5-6 years', quantity: 18 },
      { size: '7-8 years', quantity: 15 }
    ],
    totalStock: 45,
    description: 'Black and white checked dress for ECD to Grade 2'
  },
  {
    id: '6',
    name: 'ECD to Grade 2 Tie',
    category: 'ecd-grade2',
    price: 3.00,
    sizes: [
      { size: 'One Size', quantity: 50 }
    ],
    totalStock: 50,
    description: 'School tie for ECD to Grade 2 students'
  },
  {
    id: '7',
    name: 'ECD to Grade 2 Blazer',
    category: 'ecd-grade2',
    price: 25.00,
    sizes: [
      { size: 'Age 5-6', quantity: 10 },
      { size: 'Age 7-8', quantity: 12 }
    ],
    totalStock: 22,
    description: 'Black school blazer for ECD to Grade 2 students'
  },
  {
    id: '8',
    name: 'ECD to Grade 2 Tracksuit',
    category: 'ecd-grade2',
    price: 15.00,
    sizes: [
      { size: 'Age 5-6', quantity: 8 },
      { size: 'Age 7-8', quantity: 10 }
    ],
    totalStock: 18,
    description: 'Green tracksuit for ECD to Grade 2 students'
  },
  {
    id: '9',
    name: 'ECD to Grade 2 Hat',
    category: 'ecd-grade2',
    price: 5.00,
    sizes: [
      { size: 'Small', quantity: 25 },
      { size: 'Medium', quantity: 30 },
      { size: 'Large', quantity: 20 }
    ],
    totalStock: 75,
    description: 'School hat for ECD to Grade 2 students'
  },
  {
    id: '10',
    name: 'ECD to Grade 2 Jersey',
    category: 'ecd-grade2',
    price: 12.00,
    sizes: [
      { size: 'Age 5-6', quantity: 15 },
      { size: 'Age 7-8', quantity: 20 }
    ],
    totalStock: 35,
    description: 'Green school jersey for ECD to Grade 2 students'
  },
  {
    id: '11',
    name: 'Boys Uniform Short',
    category: 'ecd-grade2',
    price: 8.00,
    sizes: [
      { size: 'Age 3-4', quantity: 12 },
      { size: 'Age 5-6', quantity: 18 },
      { size: 'Age 7-8', quantity: 15 }
    ],
    totalStock: 45,
    description: 'Navy blue shorts for ECD to Grade 2 boys'
  },
  {
    id: '12',
    name: 'Boys Uniform Shirt',
    category: 'ecd-grade2',
    price: 10.00,
    sizes: [
      { size: 'Age 3-4', quantity: 10 },
      { size: 'Age 5-6', quantity: 20 },
      { size: 'Age 7-8', quantity: 18 }
    ],
    totalStock: 48,
    description: 'White school shirt for ECD to Grade 2 boys'
  },
  {
    id: '13',
    name: 'Sports Wear Short',
    category: 'ecd-grade2',
    price: 6.00,
    sizes: [
      { size: 'Age 3-4', quantity: 15 },
      { size: 'Age 5-6', quantity: 22 },
      { size: 'Age 7-8', quantity: 20 }
    ],
    totalStock: 57,
    description: 'Green sports shorts for ECD to Grade 2 students'
  },
  {
    id: '14',
    name: 'Sports Wear T-Shirt',
    category: 'ecd-grade2',
    price: 7.00,
    sizes: [
      { size: 'Age 3-4', quantity: 18 },
      { size: 'Age 5-6', quantity: 25 },
      { size: 'Age 7-8', quantity: 22 }
    ],
    totalStock: 65,
    description: 'Green sports t-shirt for ECD to Grade 2 students'
  },
  // Primary School - Grade 3 to 7
  {
    id: '15',
    name: 'School Dress',
    category: 'grade3-7',
    price: 12.00,
    sizes: [
      { size: 'Age 7-8', quantity: 12 },
      { size: 'Age 9-10', quantity: 15 },
      { size: 'Age 11-12', quantity: 10 }
    ],
    totalStock: 37,
    description: 'Black and white checked dress for Grade 3-7'
  },
  {
    id: '12',
    name: 'School Tie',
    category: 'grade3-7',
    price: 3.00,
    sizes: [
      { size: 'One Size', quantity: 40 }
    ],
    totalStock: 40,
    description: 'School tie for Grade 3-7 students'
  },
  {
    id: '13',
    name: 'School Blazer',
    category: 'grade3-7',
    price: 25.00,
    sizes: [
      { size: 'Age 7-8', quantity: 8 },
      { size: 'Age 9-10', quantity: 12 },
      { size: 'Age 11-12', quantity: 6 }
    ],
    totalStock: 26,
    description: 'Black school blazer for Grade 3-7'
  },
  {
    id: '14',
    name: 'Boys Uniform Short',
    category: 'grade3-7',
    price: 6.00,
    sizes: [
      { size: 'Age 7-8', quantity: 15 },
      { size: 'Age 9-10', quantity: 18 },
      { size: 'Age 11-12', quantity: 12 }
    ],
    totalStock: 45,
    description: 'Black school shorts for Grade 3-7'
  },
  {
    id: '15',
    name: 'Boys Uniform Shirt',
    category: 'grade3-7',
    price: 6.00,
    sizes: [
      { size: 'Age 7-8', quantity: 25 },
      { size: 'Age 9-10', quantity: 20 },
      { size: 'Age 11-12', quantity: 18 }
    ],
    totalStock: 63,
    description: 'White school shirt for Grade 3-7'
  },
  {
    id: '16',
    name: 'Primary Tracksuit',
    category: 'grade3-7',
    price: 20.00,
    sizes: [
      { size: 'Age 7-8', quantity: 10 },
      { size: 'Age 9-10', quantity: 12 },
      { size: 'Age 11-12', quantity: 8 }
    ],
    totalStock: 30,
    description: 'Green tracksuit for Grade 3-7'
  },
  {
    id: '17',
    name: 'Primary Sunhat',
    category: 'grade3-7',
    price: 5.00,
    sizes: [
      { size: 'Small', quantity: 20 },
      { size: 'Medium', quantity: 25 },
      { size: 'Large', quantity: 15 }
    ],
    totalStock: 60,
    description: 'School sunhat for Grade 3-7'
  },
  {
    id: '18',
    name: 'Primary Jersey',
    category: 'grade3-7',
    price: 15.00,
    sizes: [
      { size: 'Age 7-8', quantity: 18 },
      { size: 'Age 9-10', quantity: 22 },
      { size: 'Age 11-12', quantity: 15 }
    ],
    totalStock: 55,
    description: 'Green school jersey for Grade 3-7'
  },
  {
    id: '19',
    name: 'Sports Wear Short',
    category: 'grade3-7',
    price: 8.00,
    sizes: [
      { size: 'Age 7-8', quantity: 20 },
      { size: 'Age 9-10', quantity: 25 },
      { size: 'Age 11-12', quantity: 18 }
    ],
    totalStock: 63,
    description: 'Green sports shorts for Grade 3-7 students'
  },
  {
    id: '20',
    name: 'Sports Wear Shirt',
    category: 'grade3-7',
    price: 9.00,
    sizes: [
      { size: 'Age 7-8', quantity: 22 },
      { size: 'Age 9-10', quantity: 28 },
      { size: 'Age 11-12', quantity: 20 }
    ],
    totalStock: 70,
    description: 'Green sports t-shirt for Grade 3-7 students'
  },
  {
    id: '23',
    name: 'School Blazer',
    category: 'form5-6',
    price: 35.00,
    sizes: [
      { size: 'S (28-30)', quantity: 10 },
      { size: 'M (32-34)', quantity: 15 },
      { size: 'L (36-38)', quantity: 12 },
      { size: 'XL (40-42)', quantity: 8 }
    ],
    totalStock: 45,
    description: 'Green school blazer with school crest for Form 5-6'
  },
  {
    id: '24',
    name: 'Tracksuit Set',
    category: 'form5-6',
    price: 28.00,
    sizes: [
      { size: 'S (28-30)', quantity: 12 },
      { size: 'M (32-34)', quantity: 18 },
      { size: 'L (36-38)', quantity: 10 },
      { size: 'XL (40-42)', quantity: 8 }
    ],
    totalStock: 48,
    description: 'Green tracksuit for Form 5-6 physical education'
  },
  {
    id: '25',
    name: 'Boys Uniform Trousers',
    category: 'form5-6',
    price: 12.00,
    sizes: [
      { size: '30', quantity: 12 },
      { size: '32', quantity: 18 },
      { size: '34', quantity: 15 },
      { size: '36', quantity: 10 },
      { size: '38', quantity: 8 }
    ],
    totalStock: 63,
    description: 'Black school trousers for Form 5-6 boys'
  },
  {
    id: '26',
    name: 'School Shirt',
    category: 'form5-6',
    price: 10.00,
    sizes: [
      { size: 'S', quantity: 20 },
      { size: 'M', quantity: 25 },
      { size: 'L', quantity: 18 },
      { size: 'XL', quantity: 15 }
    ],
    totalStock: 78,
    description: 'White school shirt for Form 5-6 students'
  },
  {
    id: '27',
    name: 'Jersey',
    category: 'form5-6',
    price: 18.00,
    sizes: [
      { size: 'S', quantity: 15 },
      { size: 'M', quantity: 20 },
      { size: 'L', quantity: 18 },
      { size: 'XL', quantity: 12 }
    ],
    totalStock: 65,
    description: 'Green school jersey for Form 5-6 students'
  },
  {
    id: '28',
    name: 'Cap',
    category: 'form5-6',
    price: 6.00,
    sizes: [
      { size: 'One Size', quantity: 45 }
    ],
    totalStock: 45,
    description: 'School cap for Form 5-6 students'
  },
  {
    id: '29',
    name: 'Sun Hat',
    category: 'form5-6',
    price: 7.00,
    sizes: [
      { size: 'Small', quantity: 20 },
      { size: 'Medium', quantity: 25 },
      { size: 'Large', quantity: 18 }
    ],
    totalStock: 63,
    description: 'School sun hat for Form 5-6 students'
  },
  {
    id: '30',
    name: 'Socks',
    category: 'form5-6',
    price: 4.00,
    sizes: [
      { size: 'Small', quantity: 35 },
      { size: 'Medium', quantity: 45 },
      { size: 'Large', quantity: 30 }
    ],
    totalStock: 110,
    description: 'Black school socks for Form 5-6 students'
  },
  {
    id: '31',
    name: 'Tie',
    category: 'form5-6',
    price: 5.00,
    sizes: [
      { size: 'One Size', quantity: 55 }
    ],
    totalStock: 55,
    description: 'School tie for Form 5-6 students'
  },
  {
    id: '32',
    name: 'Girls Skirt',
    category: 'form5-6',
    price: 14.00,
    sizes: [
      { size: '26', quantity: 12 },
      { size: '28', quantity: 18 },
      { size: '30', quantity: 15 },
      { size: '32', quantity: 10 }
    ],
    totalStock: 55,
    description: 'Navy blue skirt for Form 5-6 girls'
  }
];

export function UniformInventory() {
  const [uniforms, setUniforms] = useState<UniformItem[]>(initialInventory);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');
  const [addingSize, setAddingSize] = useState<string | null>(null);
  const [newSizeData, setNewSizeData] = useState({ size: '', quantity: '' });
  const [customColorSelected, setCustomColorSelected] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [tempColor, setTempColor] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus custom input when custom is selected
  useEffect(() => {
    console.log('Custom color selected:', customColorSelected);
    console.log('Custom input ref exists:', !!customInputRef.current);
    console.log('Uniform color:', uniforms.find(u => u.id === uniforms[0]?.id)?.color);
    
    if (customInputRef.current && customColorSelected) {
      console.log('Attempting to focus custom input');
      setTimeout(() => {
        customInputRef.current?.focus();
      }, 100); // Small delay to ensure DOM is ready
    }
  }, [customColorSelected]);

  // Calculate statistics
  const totalItems = uniforms.length;
  const totalValue = uniforms.reduce((sum, item) => sum + (item.price * item.totalStock), 0);
  const primaryItems = uniforms.filter(item => item.category === 'primary').length;
  const secondaryItems = uniforms.filter(item => item.category === 'secondary').length;
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

  const handleAddUniform = () => {
    const newUniformItem: UniformItem = {
      id: Date.now().toString(),
      name: 'New Uniform Item',
      category: 'primary',
      price: 10.00,
      sizes: [
        { size: 'S', quantity: 10 },
        { size: 'M', quantity: 10 },
        { size: 'L', quantity: 10 }
      ],
      totalStock: 30,
      description: 'Newly added uniform item'
    };

    setUniforms([...uniforms, newUniformItem]);
    setShowAddForm(false);
    toast.success('Uniform item added successfully!');
  };

  const handlePriceUpdate = (itemId: string, newPrice: number) => {
    setUniforms(uniforms.map(item => 
      item.id === itemId ? { ...item, price: newPrice } : item
    ));
    setEditingPrice(null);
    setTempPrice('');
    toast.success('Price updated successfully!');
  };

  const handleSizeUpdate = (itemId: string, sizeIndex: number, newQuantity: number) => {
    setUniforms(uniforms.map(item => {
      if (item.id === itemId) {
        const updatedSizes = item.sizes.map((size, index) => 
          index === sizeIndex ? { ...size, quantity: newQuantity } : size
        );
        const newTotalStock = updatedSizes.reduce((sum, size) => sum + size.quantity, 0);
        return { ...item, sizes: updatedSizes, totalStock: newTotalStock };
      }
      return item;
    }));
    toast.success('Stock quantity updated!');
  };

  const handleAddSize = (uniformId: string) => {
    if (!newSizeData.size || !newSizeData.quantity) {
      toast.error('Please enter size details');
      return;
    }

    setUniforms(uniforms.map(item => {
      if (item.id === uniformId) {
        const existingSizeIndex = item.sizes.findIndex(s => s.size === newSizeData.size);
        let updatedSizes;
        
        if (existingSizeIndex >= 0) {
          // Update existing size
          updatedSizes = item.sizes.map((size, index) => 
            index === existingSizeIndex ? { ...size, quantity: parseInt(newSizeData.quantity) } : size
          );
        } else {
          // Add new size
          updatedSizes = [...item.sizes, { size: newSizeData.size, quantity: parseInt(newSizeData.quantity) }];
        }
        
        const newTotalStock = updatedSizes.reduce((sum, size) => sum + size.quantity, 0);
        return { ...item, sizes: updatedSizes, totalStock: newTotalStock };
      }
      return item;
    }));

    setNewSizeData({ size: '', quantity: '' });
    setAddingSize(null);
    toast.success('Size added/updated successfully!');
  };

  const handleRemoveSize = (itemId: string, sizeIndex: number) => {
    setUniforms(uniforms.map(item => {
      if (item.id === itemId) {
        const updatedSizes = item.sizes.filter((_, index) => index !== sizeIndex);
        const newTotalStock = updatedSizes.reduce((sum, size) => sum + size.quantity, 0);
        return { ...item, sizes: updatedSizes, totalStock: newTotalStock };
      }
      return item;
    }));
    toast.success('Size removed successfully!');
  };

  const handleColorChange = (uniformId: string, newColor: string) => {
    if (newColor && newColor.trim() !== '') {
      setUniforms(uniforms.map(item => 
        item.id === uniformId ? { ...item, color: newColor } : item
      ));
      toast.success('Uniform color updated!');
    }
  };

  // For custom color input - updates local state without saving immediately
  const handleCustomColorInput = (uniformId: string, newColor: string) => {
    // Only update if this is the currently editing uniform
    if (editingId === uniformId) {
      setTempColor(newColor);
    }
  };

  // Handle Enter key press for saving
  const handleCustomColorKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, uniformId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const finalColor = tempColor;
      if (finalColor && finalColor.trim() !== '') {
        setUniforms(uniforms.map(item => 
          item.id === uniformId ? { ...item, color: finalColor } : item
        ));
        toast.success('Uniform color updated!');
        // Reset local states
        setTempColor('');
        setEditingId(null);
      }
    }
  };

  // For custom color completion - saves with toast on blur
  const handleCustomColorBlur = (uniformId: string, finalColor: string) => {
    // Only save if this is the currently editing uniform
    if (editingId === uniformId && finalColor && finalColor.trim() !== '') {
      setUniforms(uniforms.map(item => 
        item.id === uniformId ? { ...item, color: finalColor } : item
      ));
      toast.success('Uniform color updated!');
      // Reset local states
      setTempColor('');
      setEditingId(null);
    }
  };

  // Close custom input when clicking outside
  const closeCustomInput = () => {
    setEditingId(null);
    setTempColor('');
  };

  const primaryUniforms = uniforms.filter(item => item.category === 'primary');
  const secondaryUniforms = uniforms.filter(item => item.category === 'secondary');

  const renderUniformCard = (uniform: UniformItem, section: string) => (
    <GlassCard 
      key={uniform.id} 
      className="border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 shadow-sm p-6"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-['Space_Grotesk'] text-lg font-semibold">{uniform.name}</h4>
            <p className="text-sm text-muted-foreground font-['Inter']">{section}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStockLevelBadge(uniform.totalStock)}
            <div className="flex items-center gap-2">
              <Label className="font-['Inter'] text-xs">Color:</Label>
              <Select
                value={uniform.color === 'custom' ? tempColor : (uniform.color || 'white')}
                onValueChange={(value) => {
                  console.log('Dropdown value changed to:', value);
                  if (value !== 'custom') {
                    console.log('Calling handleColorChange with:', value);
                    handleColorChange(uniform.id, value);
                  } else {
                    console.log('Setting editingId to:', uniform.id);
                    // Only set editingId to show input on specific card
                    setEditingId(uniform.id);
                    setTempColor('');
                  }
                }}
              >
                <SelectTrigger className="w-24 h-6 text-xs font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="white" className="font-['Inter'] text-xs">White</SelectItem>
                  <SelectItem value="green" className="font-['Inter'] text-xs">Green</SelectItem>
                  <SelectItem value="blue" className="font-['Inter'] text-xs">Blue</SelectItem>
                  <SelectItem value="gray" className="font-['Inter'] text-xs">Gray</SelectItem>
                  {uniform.color && uniform.color !== 'custom' && uniform.color !== 'white' && uniform.color !== 'green' && uniform.color !== 'blue' && uniform.color !== 'gray' && (
                    <SelectItem value={uniform.color} className="font-['Inter'] text-xs capitalize">{uniform.color}</SelectItem>
                  )}
                  <SelectItem value="custom" className="font-['Inter'] text-xs">Custom</SelectItem>
                </SelectContent>
              </Select>
              {editingId === uniform.id && (
                <div className="absolute top-2 right-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-2">
                  <Label className="font-['Inter'] text-xs mb-1 text-gray-900 dark:text-gray-100">Custom Color:</Label>
                  <Input
                    ref={customInputRef}
                    type="text"
                    placeholder="Enter color"
                    value={tempColor}
                    onChange={(e) => handleCustomColorInput(uniform.id, e.target.value)}
                    onKeyPress={(e) => handleCustomColorKeyPress(e, uniform.id)}
                    onBlur={(e) => handleCustomColorBlur(uniform.id, e.target.value)}
                    onFocus={() => setCustomColorSelected(false)}
                    className="w-24 h-6 text-xs font-['Inter'] border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Price Section */}
        <div className="flex items-center justify-between">
          <Label className="font-['Inter'] text-sm">Price:</Label>
          {editingPrice === uniform.id ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                value={tempPrice}
                onChange={(e) => setTempPrice(e.target.value)}
                className="w-24 h-8 text-sm font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
              />
              <Button
                size="sm"
                onClick={() => handlePriceUpdate(uniform.id, parseFloat(tempPrice))}
                className="h-8 bg-[#10B981] hover:bg-[#059669]"
              >
                <Check className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingPrice(null);
                  setTempPrice('');
                }}
                className="h-8"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-['Space_Grotesk'] text-lg font-bold text-[#10B981]">
                ${uniform.price.toFixed(2)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingPrice(uniform.id);
                  setTempPrice(uniform.price.toString());
                }}
                className="h-6 w-6 p-0 text-[#3B82F6] hover:text-[#2563EB]"
              >
                <Edit className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Size Management Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="font-['Inter'] text-sm">Size Management:</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddingSize(addingSize === uniform.id ? null : uniform.id)}
              className="h-6 text-[#3B82F6] hover:text-[#2563EB] text-xs font-['Inter']"
            >
              <Plus className="w-3 h-3 mr-1" />
              {addingSize === uniform.id ? 'Cancel' : 'Add Size'}
            </Button>
          </div>
          
          {addingSize === uniform.id && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800 mb-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={newSizeData.size}
                  onChange={(e) => setNewSizeData({...newSizeData, size: e.target.value})}
                  placeholder="Size name"
                  className="h-8 text-sm font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                />
                <Input
                  type="number"
                  value={newSizeData.quantity}
                  onChange={(e) => setNewSizeData({...newSizeData, quantity: e.target.value})}
                  placeholder="Quantity"
                  className="h-8 text-sm font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  onClick={() => handleAddSize(uniform.id)}
                  size="sm"
                  className="h-6 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-['Inter']"
                >
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAddingSize(null);
                    setNewSizeData({ size: '', quantity: '' });
                  }}
                  className="h-6 text-xs font-['Inter']"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            {uniform.sizes.map((size, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-['Inter']">{size.size}</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={size.quantity}
                    onChange={(e) => handleSizeUpdate(uniform.id, index, parseInt(e.target.value) || 0)}
                    className={`w-16 h-6 text-sm font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 ${
                      size.quantity < 5 ? 'border-[#F59E0B] bg-[#F59E0B]/10' : ''
                    }`}
                  />
                  <span className="text-xs text-muted-foreground font-['Inter']">pcs</span>
                  {size.quantity < 5 && (
                    <span className="text-xs text-[#F59E0B] font-['Inter']">Low Stock</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSize(uniform.id, index)}
                    className="h-6 w-6 p-0 text-[#EF4444] hover:text-[#DC2626]"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total Stock */}
        <div className="pt-2 border-t border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-sm font-['Inter']">Total Stock:</span>
            <span className="font-['Space_Grotesk'] font-bold">{uniform.totalStock} pieces</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );

  return (
    <div className="space-y-6 bg-gray-50 dark:bg-transparent min-h-screen pt-20 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-['Space_Grotesk'] text-[#10B981]">Uniform Inventory</h1>
          <p className="text-muted-foreground font-['Inter']">Manage school uniform inventory and pricing</p>
        </div>
      </div>

      {/* Static Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-[999] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 p-4">
          {/* Navigation Buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                const element = document.getElementById('ecd-grade2-section');
                const navHeight = 80; // Approximate navigation bar height
                const elementPosition = element?.getBoundingClientRect().top + window.pageYOffset;
                window.scrollTo({ top: elementPosition - navHeight, behavior: 'smooth' });
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white font-['Inter'] transition-colors"
            >
              ECD to Grade 2
            </Button>
            <Button
              onClick={() => {
                const element = document.getElementById('grade3-7-section');
                const navHeight = 80; // Approximate navigation bar height
                const elementPosition = element?.getBoundingClientRect().top + window.pageYOffset;
                window.scrollTo({ top: elementPosition - navHeight, behavior: 'smooth' });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-['Inter'] transition-colors"
            >
              Grade 3 to 7
            </Button>
            <Button
              onClick={() => {
                const element = document.getElementById('form1-4-section');
                const navHeight = 80; // Approximate navigation bar height
                const elementPosition = element?.getBoundingClientRect().top + window.pageYOffset;
                window.scrollTo({ top: elementPosition - navHeight, behavior: 'smooth' });
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white font-['Inter'] transition-colors"
            >
              Form 1 to Form 4
            </Button>
            <Button
              onClick={() => {
                const element = document.getElementById('form5-6-section');
                const navHeight = 80; // Approximate navigation bar height
                const elementPosition = element?.getBoundingClientRect().top + window.pageYOffset;
                window.scrollTo({ top: elementPosition - navHeight, behavior: 'smooth' });
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-['Inter'] transition-colors"
            >
              Form 5 to Form 6
            </Button>
          </div>
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
              className="bg-[#10B981] hover:bg-[#059669] text-white rounded-[20px] font-['Inter']"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Uniform Item
            </Button>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="font-['Inter']">Uniform Name</Label>
                <Input
                  placeholder="e.g., School Blazer"
                  className="font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                />
              </div>
              
              <div>
                <Label className="font-['Inter']">Category</Label>
                <Select>
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
                  placeholder="0.00"
                  className="font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                />
              </div>
              
              <div>
                <Label className="font-['Inter']">Initial Sizes</Label>
                <Input
                  placeholder="e.g., S:10, M:15, L:8"
                  className="font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                />
              </div>
              
              <div className="md:col-span-2 lg:col-span-4">
                <Label className="font-['Inter']">Description</Label>
                <Input
                  placeholder="Optional description"
                  className="font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                />
              </div>
              
              <div className="md:col-span-2 lg:col-span-4 flex gap-3">
                <Button
                  onClick={handleAddUniform}
                  className="bg-[#10B981] hover:bg-[#059669] text-white rounded-[20px] font-['Inter']"
                >
                  Add Uniform
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  className="font-['Inter'] border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter']">Total Items</p>
              <p className="text-2xl font-bold font-['Space_Grotesk']">{totalItems}</p>
            </div>
            <Package className="w-8 h-8 text-[#3B82F6]" />
          </div>
        </GlassCard>

        <GlassCard className="border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter']">Total Value</p>
              <p className="text-2xl font-bold font-['Space_Grotesk']">${totalValue.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-[#10B981]" />
          </div>
        </GlassCard>

        <GlassCard className="border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter']">Primary Items</p>
              <p className="text-2xl font-bold font-['Space_Grotesk'] text-gray-800">{primaryItems}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-gray-800" />
          </div>
        </GlassCard>

        <GlassCard className="border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter']">Secondary Items</p>
              <p className="text-2xl font-bold font-['Space_Grotesk'] text-green-600">{secondaryItems}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </GlassCard>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems > 0 && (
        <GlassCard className="border border-[#F59E0B] bg-[#F59E0B]/10 dark:border-[#F59E0B]/30 dark:bg-[#F59E0B]/10">
          <div className="flex items-center gap-3 p-4">
            <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
            <p className="font-['Inter'] text-[#F59E0B]">
              {lowStockItems} uniform item{lowStockItems > 1 ? 's' : ''} with low stock levels. Please review inventory.
            </p>
          </div>
        </GlassCard>
      )}

      {/* Primary School Section */}
      <div id="primary-school-section" className="space-y-8">
        <h2 className="text-2xl font-['Space_Grotesk'] mb-6">Primary School</h2>
        
        {/* ECD to Grade 2 Subsection */}
        <div id="ecd-grade2-section" className="space-y-6">
          <h3 className="text-xl font-['Space_Grotesk'] mb-4">ECD to Grade 2</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniforms.filter(u => u.category === 'ecd-grade2' && 
              ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14'].includes(u.id)
            ).map((uniform) => renderUniformCard(uniform, 'ECD to Grade 2'))}
          </div>
        </div>

        {/* ECD to Grade 2 Inventory Table */}
        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-['Space_Grotesk'] mb-4">ECD to Grade 2 - Inventory Summary</h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Uniform Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Stock</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {uniforms.filter(u => u.category === 'ecd-grade2' && 
                    ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14'].includes(u.id)
                  ).map((uniform, uniformIndex) => (
                    <React.Fragment key={uniform.id}>
                      {uniform.sizes.map((size, sizeIndex) => {
                        const isEvenRow = (uniformIndex * uniform.sizes.length + sizeIndex) % 2 === 0;
                        return (
                          <tr key={`${uniform.id}-${sizeIndex}`} className={`${
                            isEvenRow 
                              ? 'bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/20' 
                              : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                          } transition-colors`}>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {sizeIndex === 0 ? uniform.name : ''}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {sizeIndex === 0 ? `$${uniform.price.toFixed(2)}` : ''}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {size.size}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {size.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {sizeIndex === 0 ? uniform.totalStock : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-t-2 border-gray-200 dark:border-gray-600">
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Total Items in ECD to Grade 2:
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {uniforms.filter(u => u.category === 'ecd-grade2' && 
                        ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14'].includes(u.id)
                      ).reduce((sum, uniform) => sum + uniform.totalStock, 0)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {uniforms.filter(u => u.category === 'ecd-grade2' && 
                        ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14'].includes(u.id)
                      ).length} items
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Grade 3 to 7 Subsection */}
        <div id="grade3-7-section" className="space-y-6">
          <h3 className="text-xl font-['Space_Grotesk'] mb-4">Grade 3 to 7</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniforms.filter(u => u.category === 'grade3-7' && 
              ['14', '15', '16', '17', '18', '19', '20'].includes(u.id)
            ).map((uniform) => renderUniformCard(uniform, 'Grade 3 to 7'))}
          </div>
        </div>

        {/* Grade 3 to 7 Inventory Table */}
        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-['Space_Grotesk'] mb-4">Grade 3 to 7 - Inventory Summary</h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Uniform Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Stock</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {uniforms.filter(u => u.category === 'grade3-7' && 
                    ['14', '15', '16', '17', '18', '19', '20'].includes(u.id)
                  ).map((uniform, uniformIndex) => (
                    <React.Fragment key={uniform.id}>
                      {uniform.sizes.map((size, sizeIndex) => {
                        const isEvenRow = (uniformIndex * uniform.sizes.length + sizeIndex) % 2 === 0;
                        return (
                          <tr key={`${uniform.id}-${sizeIndex}`} className={`${
                            isEvenRow 
                              ? 'bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20' 
                              : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-green-50 dark:hover:bg-green-900/20'
                          } transition-colors`}>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {sizeIndex === 0 ? uniform.name : ''}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {sizeIndex === 0 ? `$${uniform.price.toFixed(2)}` : ''}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {size.size}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {size.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {sizeIndex === 0 ? uniform.totalStock : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-t-2 border-gray-200 dark:border-gray-600">
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Total Items in Grade 3 to 7:
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {uniforms.filter(u => u.category === 'grade3-7' && 
                        ['14', '15', '16', '17', '18', '19', '20'].includes(u.id)
                      ).reduce((sum, uniform) => sum + uniform.totalStock, 0)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {uniforms.filter(u => u.category === 'grade3-7' && 
                        ['14', '15', '16', '17', '18', '19', '20'].includes(u.id)
                      ).length} items
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary School Section */}
      <div className="space-y-8">
        <h2 className="text-2xl font-['Space_Grotesk'] mb-6">Secondary School</h2>
        
        {/* Form 1 to Form 4 Subsection */}
        <div id="form1-4-section" className="space-y-6">
          <h3 className="text-xl font-['Space_Grotesk'] mb-4">Form 1 to Form 4</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniforms.filter(u => u.category === 'form1-4' && 
              ['1', '2', '3', '4', '31', '32', '33', '34', '35', '36', '37', '38'].includes(u.id)
            ).map((uniform) => renderUniformCard(uniform, 'Form 1 to Form 4'))}
          </div>
        </div>

        {/* Form 1 to Form 4 Inventory Table */}
        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-['Space_Grotesk'] mb-4">Form 1 to Form 4 - Inventory Summary</h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Uniform Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Stock</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {uniforms.filter(u => u.category === 'form1-4' && 
                    ['1', '2', '3', '4', '31', '32', '33', '34', '35', '36', '37', '38'].includes(u.id)
                  ).map((uniform, uniformIndex) => (
                    <React.Fragment key={uniform.id}>
                      {uniform.sizes.map((size, sizeIndex) => {
                        const isEvenRow = (uniformIndex * uniform.sizes.length + sizeIndex) % 2 === 0;
                        return (
                          <tr key={`${uniform.id}-${sizeIndex}`} className={`${
                            isEvenRow 
                              ? 'bg-white dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20' 
                              : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                          } transition-colors`}>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {sizeIndex === 0 ? uniform.name : ''}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {sizeIndex === 0 ? `$${uniform.price.toFixed(2)}` : ''}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {size.size}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {size.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {sizeIndex === 0 ? uniform.totalStock : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-t-2 border-gray-200 dark:border-gray-600">
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Total Items in Form 1 to Form 4:
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {uniforms.filter(u => u.category === 'form1-4' && 
                        ['1', '2', '3', '4', '31', '32', '33', '34', '35', '36', '37', '38'].includes(u.id)
                      ).reduce((sum, uniform) => sum + uniform.totalStock, 0)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {uniforms.filter(u => u.category === 'form1-4' && 
                        ['1', '2', '3', '4', '31', '32', '33', '34', '35', '36', '37', '38'].includes(u.id)
                      ).length} items
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Form 5 to Form 6 Subsection */}
        <div id="form5-6-section" className="space-y-6">
          <h3 className="text-xl font-['Space_Grotesk'] mb-4">Form 5 to Form 6</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniforms.filter(u => u.category === 'form5-6' && 
              ['21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32'].includes(u.id)
            ).map((uniform) => renderUniformCard(uniform, 'Form 5-6'))}
          </div>
        </div>

        {/* Form 5 to Form 6 Inventory Table */}
        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-['Space_Grotesk'] mb-4">Form 5 to Form 6 - Inventory Summary</h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Uniform Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Stock</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {uniforms.filter(u => u.category === 'form5-6' && 
                    ['21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32'].includes(u.id)
                  ).map((uniform, uniformIndex) => (
                    <React.Fragment key={uniform.id}>
                      {uniform.sizes.map((size, sizeIndex) => {
                        const isEvenRow = (uniformIndex * uniform.sizes.length + sizeIndex) % 2 === 0;
                        return (
                          <tr key={`${uniform.id}-${sizeIndex}`} className={`${
                            isEvenRow 
                              ? 'bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20' 
                              : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                          } transition-colors`}>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {sizeIndex === 0 ? uniform.name : ''}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {sizeIndex === 0 ? `$${uniform.price.toFixed(2)}` : ''}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {size.size}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {size.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {sizeIndex === 0 ? uniform.totalStock : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-t-2 border-gray-200 dark:border-gray-600">
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Total Items in Form 5 to Form 6:
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {uniforms.filter(u => u.category === 'form5-6' && 
                        ['21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32'].includes(u.id)
                      ).reduce((sum, uniform) => sum + uniform.totalStock, 0)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {uniforms.filter(u => u.category === 'form5-6' && 
                        ['21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32'].includes(u.id)
                      ).length} items
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
