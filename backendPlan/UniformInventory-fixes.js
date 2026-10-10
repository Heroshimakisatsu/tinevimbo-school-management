// PATCH for src/app/pages/UniformInventory.tsx
// 
// PROBLEM 1: fetchUniforms() calls api.get('/uniforms') but the backend
//            now returns { data: [...], count: N } not a raw array.
//            Fix: destructure .data from the response.
//
// PROBLEM 2: handleAddUniform checks res.id but backend returns { data: { id, ... } }
//            Fix: destructure res.data.id
//
// PROBLEM 3: All other API calls (patch, post, delete) don't need the response
//            shape fixed since they don't use the return value critically,
//            but consistency is added anyway.
//
// REPLACE these functions in UniformInventory.tsx:

// ─────────────────────────────────────────────────────────────
// 1. REPLACE fetchUniforms (around line 53)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// 2. REPLACE handleAddUniform (around line 92)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// 3. REPLACE handlePriceUpdate (around line 131)
// ─────────────────────────────────────────────────────────────
const handlePriceUpdate = async (uniformId: string, newPrice: number) => {
  try {
    // Backend returns { data: updatedUniform }
    await api.patch(`/uniforms/${uniformId}`, { price: newPrice });

    // Update local state immediately (optimistic update)
    setUniforms(prev =>
      prev.map(item =>
        item.id === uniformId ? { ...item, price: newPrice } : item
      )
    );
    setEditingPrice(null);
    setTempPrice('');
    toast.success('Price updated successfully!');
  } catch (e: any) {
    toast.error(e.message || 'Failed to update price');
  }
};

// ─────────────────────────────────────────────────────────────
// 4. REPLACE handleSizeUpdate (around line 144)
// ─────────────────────────────────────────────────────────────
const handleSizeUpdate = async (uniformId: string, sizeId: number, newQuantity: number) => {
  if (newQuantity < 0) {
    toast.error('Quantity cannot be negative');
    return;
  }

  try {
    // Backend returns { data: updatedSize }
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

// ─────────────────────────────────────────────────────────────
// 5. REPLACE handleAddSize (around line 164)
// ─────────────────────────────────────────────────────────────
const handleAddSize = async (uniformId: string) => {
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
    await api.post(`/uniforms/${uniformId}/sizes`, {
      size_label: newSizeData.size,
      quantity:   qty,
    });

    // Refetch to get accurate totals from server
    await fetchUniforms();

    setNewSizeData({ size: '', quantity: '' });
    setAddingSize(null);
    toast.success('Size added successfully!');
  } catch (e: any) {
    toast.error(e.message || 'Failed to add size');
  }
};

// ─────────────────────────────────────────────────────────────
// 6. REPLACE handleRemoveSize (around line 188)
// ─────────────────────────────────────────────────────────────
const handleRemoveSize = async (uniformId: string, sizeId: number) => {
  try {
    await api.delete(`/uniforms/${uniformId}/sizes/${sizeId}`);

    // Update local state immediately (optimistic update)
    setUniforms(prev =>
      prev.map(item => {
        if (item.id === uniformId) {
          const updatedSizes = item.sizes.filter((sz: any) => sz.id !== sizeId);
          const newTotalStock = updatedSizes.reduce(
            (sum: number, sz: any) => sum + sz.quantity, 0
          );
          return { ...item, sizes: updatedSizes, totalStock: newTotalStock };
        }
        return item;
      })
    );
    toast.success('Size removed successfully!');
  } catch (e: any) {
    toast.error(e.message || 'Failed to remove size');
  }
};

// ─────────────────────────────────────────────────────────────
// 7. REPLACE handleColorChange (around line 204)
// ─────────────────────────────────────────────────────────────
const handleColorChange = async (uniformId: string, newColor: string) => {
  if (!newColor || newColor.trim() === '') return;

  try {
    await api.patch(`/uniforms/${uniformId}`, { color: newColor });

    setUniforms(prev =>
      prev.map(item =>
        item.id === uniformId ? { ...item, color: newColor } : item
      )
    );
    toast.success('Uniform color updated!');
  } catch (e: any) {
    toast.error(e.message || 'Failed to update color');
  }
};
