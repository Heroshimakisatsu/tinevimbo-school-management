import { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { X, Shirt, Bus, Utensils, GraduationCap, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../../utils/api';

interface UniformSelectorProps {
  grade: string;
  selectedUniforms: any[];
  onUniformSelect: (uniform: any) => void;
  onUniformRemove: (uniformId: number, sizeId: number) => void;
}

function UniformSelector({ grade, selectedUniforms, onUniformSelect, onUniformRemove }: UniformSelectorProps) {
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('male');
  const [uniforms, setUniforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSizeForCard, setSelectedSizeForCard] = useState<Record<number, number>>({});

  useEffect(() => {
    const fetchUniforms = async () => {
      if (!grade) return;
      setLoading(true);
      try {
        const response = await api.get<any>('/uniforms', { grade, gender: selectedGender });
        const data = response.data || [];
        setUniforms(data);
        
        // Default select first size
        const initialSizes: Record<number, number> = {};
        data.forEach(item => {
          if (item.sizes && item.sizes.length > 0) {
            initialSizes[item.id] = item.sizes[0].id;
          }
        });
        setSelectedSizeForCard(initialSizes);
      } catch (error) {
        console.error('Failed to load uniforms for intake:', error);
        setUniforms([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUniforms();
  }, [grade, selectedGender]);

  return (
    <div className="space-y-4">
      {/* Gender Selection */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={selectedGender === 'male' ? 'default' : 'outline'}
          onClick={() => setSelectedGender('male')}
          className="flex-1 rounded-[20px] font-['Space_Grotesk']"
        >
          Male
        </Button>
        <Button
          type="button"
          variant={selectedGender === 'female' ? 'default' : 'outline'}
          onClick={() => setSelectedGender('female')}
          className="flex-1 rounded-[20px] font-['Space_Grotesk']"
        >
          Female
        </Button>
      </div>

      {/* Uniform Items Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {uniforms.map((uniform) => {
            const sizeId = selectedSizeForCard[uniform.id];
            const sizeObj = uniform.sizes?.find((s: any) => s.id === sizeId);
            const isSelected = selectedUniforms.some(u => u.uniformId === uniform.id && u.sizeId === sizeId);
            const isOutOfStock = !sizeObj || sizeObj.quantity <= 0;

            return (
              <div
                key={uniform.id}
                className={`p-4 rounded-[16px] border-2 flex flex-col items-center justify-between gap-3 transition-all relative ${
                  isSelected
                    ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500 dark:border-purple-400'
                    : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10'
                }`}
              >
                <div className="flex flex-col items-center gap-1 text-center">
                  <Shirt className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                  <span className="font-['Space_Grotesk'] font-semibold text-sm leading-tight text-zinc-950 dark:text-zinc-50">{uniform.name}</span>
                  <span className="text-xs text-muted-foreground font-['Inter']">${uniform.price.toFixed(2)}</span>
                </div>

                {/* Size Dropdown */}
                {uniform.sizes && uniform.sizes.length > 0 ? (
                  <div className="w-full">
                    <select
                      value={sizeId || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setSelectedSizeForCard(prev => ({ ...prev, [uniform.id]: val }));
                      }}
                      className="w-full text-xs p-1.5 rounded-[12px] bg-background border border-border outline-none font-['Inter'] dark:text-zinc-50 text-zinc-950"
                    >
                      {uniform.sizes.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          Size {s.size_label} ({s.quantity} left)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="text-[10px] text-[#EF4444] font-['Inter']">No sizes configured</div>
                )}

                <Button
                  type="button"
                  variant={isSelected ? "secondary" : "default"}
                  disabled={isOutOfStock || !sizeObj}
                  onClick={() => {
                    if (isSelected) {
                      onUniformRemove(uniform.id, sizeId);
                    } else if (sizeObj) {
                      onUniformSelect({
                        uniformId: uniform.id,
                        sizeId: sizeId,
                        sizeLabel: sizeObj.size_label,
                        name: uniform.name,
                        price: uniform.price,
                        amount: uniform.price
                      });
                    }
                  }}
                  className={`w-full text-xs font-['Space_Grotesk'] rounded-[12px] h-8 mt-1 ${
                    isSelected ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''
                  }`}
                >
                  {isSelected ? 'Selected' : (isOutOfStock ? 'Out of stock' : 'Add to cart')}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Uniforms Summary */}
      {selectedUniforms.length > 0 && (
        <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-[16px]">
          <h4 className="font-['Space_Grotesk'] font-semibold mb-2">Cart items:</h4>
          <div className="space-y-2">
            {selectedUniforms.map((uniform) => (
              <div key={`${uniform.uniformId}-${uniform.sizeId}`} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-['Inter'] font-medium">{uniform.name} (Size {uniform.sizeLabel})</span>
                    <Input
                      type="text"
                      value={uniform.receiptNumber || ''}
                      onChange={(e) => {
                        onUniformRemove(uniform.uniformId, uniform.sizeId);
                        onUniformSelect({ ...uniform, receiptNumber: e.target.value });
                      }}
                      placeholder="Receipt #"
                      className="w-16 h-5 text-[10px] rounded-[6px]"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <Input
                    type="number"
                    value={uniform.amount}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      onUniformRemove(uniform.uniformId, uniform.sizeId);
                      onUniformSelect({ ...uniform, amount: value });
                    }}
                    className="w-16 h-7 text-xs rounded-[8px]"
                  />
                  <span className="text-xs font-medium">$</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onUniformRemove(uniform.uniformId, uniform.sizeId)}
                  className="h-6 w-6 p-0 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Intake() {
  const currentPaymentMonth = new Date().toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const getSavedRegistrationDefault = () => {
    const savedValue = localStorage.getItem('tinevimbo.registrationDefaultFee');
    const numericValue = Number(savedValue);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 20;
  };

  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    registrationFeeAmount: String(getSavedRegistrationDefault()),
    tuitionFeeAmount: '',
    parentPhoneNumber: '',
  });

  const [defaultRegistrationFee, setDefaultRegistrationFee] = useState(getSavedRegistrationDefault());
  const [submitting, setSubmitting] = useState(false);
  const [registrationReceiptNumber, setRegistrationReceiptNumber] = useState('');
  
  // Receipt number previews for each payment type
  const [receiptPreviews, setReceiptPreviews] = useState({
    tuition: '',
    transport: '',
    relish: '',
    uniform: ''
  });

  const getTuitionBookTypeLabel = (grade: string) => {
    if (!grade) return 'Primary';
    return ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'].includes(grade)
      ? 'Secondary'
      : 'Primary';
  };

  // Payment items state
  const [selectedItems, setSelectedItems] = useState({
    tuition: { selected: false, amount: 30, defaultAmount: 30, receiptNumber: '' },
    transport: { selected: false, amount: 25, defaultAmount: 25, receiptNumber: '' },
    relish: { selected: false, amount: 15, defaultAmount: 15, receiptNumber: '' },
    uniforms: [] as any[],
  });

  const [uniformModalOpen, setUniformModalOpen] = useState(false);
  const [receiptDrafts, setReceiptDrafts] = useState<Record<string, string>>({});
  const [receiptChangeRequests, setReceiptChangeRequests] = useState<Record<string, { current: string; next: string }>>({});
  const [receiptChangeReasons, setReceiptChangeReasons] = useState<Record<string, string>>({});
  const [receiptChangeActors, setReceiptChangeActors] = useState<Record<string, string>>({});

  // Fetch current receipt numbers to show next receipt preview
  const fetchReceiptPreviews = async () => {
    try {
      const response = await api.get('/receipts/current');
      const isSecondaryTuition = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'].includes(formData.grade);

      setReceiptPreviews({
        tuition: isSecondaryTuition
          ? (response.secondary_tuition?.formatted || '0001')
          : (response.primary_tuition?.formatted || '0001'),
        transport: response.transport?.formatted || '0001',
        relish: response.primary_tuition?.formatted || '0001',
        uniform: response.uniform?.formatted || '0001'
      });
    } catch (error) {
      console.error('Failed to fetch receipt previews:', error);
    }
  };

  const getReceiptValueForKey = (key: string) => {
    switch (key) {
      case 'tuition':
        return selectedItems.tuition.receiptNumber || receiptPreviews.tuition;
      case 'transport':
        return selectedItems.transport.receiptNumber || receiptPreviews.transport;
      case 'uniform':
        return selectedItems.uniforms[0]?.receiptNumber || receiptPreviews.uniform;
      default:
        return '';
    }
  };

  const resetReceiptChange = (key: string) => {
    setReceiptChangeRequests(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setReceiptChangeReasons(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setReceiptChangeActors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setReceiptDrafts(prev => ({
      ...prev,
      [key]: getReceiptValueForKey(key)
    }));
  };

  const handleReceiptValueChange = (key: string, rawValue: string) => {
    const nextValue = rawValue.replace(/[^0-9]/g, '');
    const currentValue = getReceiptValueForKey(key) || '';

    setReceiptDrafts(prev => ({
      ...prev,
      [key]: nextValue
    }));

    if (nextValue === currentValue) {
      resetReceiptChange(key);
      return;
    }

    setReceiptChangeRequests(prev => ({
      ...prev,
      [key]: {
        current: currentValue,
        next: nextValue
      }
    }));
    setReceiptChangeReasons(prev => ({
      ...prev,
      [key]: prev[key] || ''
    }));
  };

  const applyReceiptChange = async (key: string) => {
    const request = receiptChangeRequests[key];
    const note = (receiptChangeReasons[key] || '').trim();
    const changedBy = (receiptChangeActors[key] || 'Current User').trim() || 'Current User';

    if (!request || !note || !changedBy) return;

    try {
      await api.post('/logs/receipt-change', {
        payment_type: key,
        changed_by: changedBy,
        previous_value: request.current || null,
        new_value: request.next,
        reason: note,
        details: `${changedBy} changed the receipt number for ${key} from ${request.current || 'initial'} to ${request.next}`
      });

      if (key === 'tuition') {
        setSelectedItems(prev => ({ ...prev, tuition: { ...prev.tuition, receiptNumber: request.next } }));
      }

      if (key === 'transport') {
        setSelectedItems(prev => ({ ...prev, transport: { ...prev.transport, receiptNumber: request.next } }));
      }

      if (key === 'uniform') {
        setSelectedItems(prev => ({
          ...prev,
          uniforms: prev.uniforms.map((u, index) => index === 0 ? { ...u, receiptNumber: request.next } : u)
        }));
      }

      setReceiptDrafts(prev => ({ ...prev, [key]: request.next }));
      toast.success('Receipt override saved', {
        description: `${changedBy} updated ${key} receipt to ${request.next}.`
      });
    } catch (error: any) {
      toast.error('Receipt change log failed', {
        description: error.message || 'Unable to save the override log.'
      });
      return;
    }

    resetReceiptChange(key);
  };

  // Update receipt previews when grade changes
  useEffect(() => {
    if (formData.grade) {
      fetchReceiptPreviews();
    }
  }, [formData.grade]);

  // Calculate total payment amount
  const isECDStudent = formData.grade === 'ECD A' || formData.grade === 'ECD B';
  const totalPaymentAmount = (parseFloat(formData.registrationFeeAmount) || 0) +
    (selectedItems.tuition.selected ? selectedItems.tuition.amount : 0) +
    (selectedItems.transport.selected ? selectedItems.transport.amount : 0) +
    (isECDStudent && selectedItems.relish.selected ? selectedItems.relish.amount : 0) +
    selectedItems.uniforms.reduce((sum, uniform) => sum + uniform.amount, 0);

  // Persist the registration-fee default for future registrations
  useEffect(() => {
    localStorage.setItem('tinevimbo.registrationDefaultFee', String(defaultRegistrationFee));
  }, [defaultRegistrationFee]);

  const setAsDefaultRegistrationFee = () => {
    const nextDefaultValue = parseFloat(formData.registrationFeeAmount) || 20;
    setDefaultRegistrationFee(nextDefaultValue);
    setFormData(prev => ({ ...prev, registrationFeeAmount: String(nextDefaultValue) }));
    toast.success('Registration fee saved as default!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if registration fee is paid (has amount entered)
    if (!formData.registrationFeeAmount || parseFloat(formData.registrationFeeAmount) <= 0) {
      toast.error('Pay registration fee in order to register!');
      return;
    }

    setSubmitting(true);
    
    try {
      // Split first name and surname
      const nameParts = formData.name.trim().split(/\s+/);
      const first_name = nameParts[0] || '';
      const surname = nameParts.slice(1).join(' ') || 'Unknown';

      const payments: any[] = [];
      
      // Add registration fee as a payment transaction
      if (formData.registrationFeeAmount && parseFloat(formData.registrationFeeAmount) > 0) {
        payments.push({ 
          type: 'tuition', // registration fee is recorded under tuition type per backend logic
          amount: parseFloat(formData.registrationFeeAmount), 
          payment_method: 'cash',
          receipt_number: registrationReceiptNumber || null
        });
      }
      
      if (selectedItems.tuition.selected) {
        payments.push({ 
          type: 'tuition', 
          amount: selectedItems.tuition.amount, 
          payment_method: 'cash',
          receipt_number: selectedItems.tuition.receiptNumber || null
        });
      }
      if (selectedItems.transport.selected) {
        payments.push({ 
          type: 'transport', 
          amount: selectedItems.transport.amount, 
          payment_method: 'cash',
          receipt_number: selectedItems.transport.receiptNumber || null
        });
      }
      // Only add relish payment for ECD students
      if (selectedItems.relish.selected && (formData.grade === 'ECD A' || formData.grade === 'ECD B')) {
        payments.push({ 
          type: 'relish', 
          amount: selectedItems.relish.amount, 
          payment_method: 'cash',
          receipt_number: selectedItems.relish.receiptNumber || null
        });
      }
      if (selectedItems.uniforms.length > 0) {
        // Each uniform item gets its own payment entry
        selectedItems.uniforms.forEach(u => {
          payments.push({
            type: 'uniform',
            amount: u.amount,
            payment_method: 'cash',
            uniform_items: [{
              uniform_id: u.uniformId,
              uniform_size_id: u.sizeId,
              quantity: 1,
              price: u.price,
              size_label: u.sizeLabel,
              receipt_number: u.receiptNumber || null
            }]
          });
        });
      }

      const payload = {
        first_name,
        surname,
        grade: formData.grade,
        gender: selectedItems.uniforms[0]?.gender || 'male', // default gender helper
        registration_fee_paid: 1,
        registration_fee_amount: parseFloat(formData.registrationFeeAmount) || 0,
        parent_phone_number: formData.parentPhoneNumber,
        academic_year: String(new Date().getFullYear()),
        term: 1, // default term
        payments
      };

      const res = await api.post<any>('/intake/register', payload);

      // Show receipt numbers in success message
      const receiptNumbers = res.data?.receipt_numbers || [];
      const receiptText = receiptNumbers.length > 0 
        ? `Receipts: ${receiptNumbers.join(', ')}` 
        : '';

      toast.success(`Success: ${first_name} ${surname} registered!`, {
        description: `Reg Number: ${res.data.registration_number}${receiptText ? ` | ${receiptText}` : ''}`,
      });

      // Reset form
      setFormData({
        name: '',
        grade: '',
        registrationFeeAmount: String(defaultRegistrationFee),
        tuitionFeeAmount: '',
        parentPhoneNumber: '',
      });
      setRegistrationReceiptNumber('');
      setSelectedItems({
        tuition: { selected: false, amount: 30, defaultAmount: 30, receiptNumber: '' },
        transport: { selected: false, amount: 25, defaultAmount: 25, receiptNumber: '' },
        relish: { selected: false, amount: 15, defaultAmount: 15, receiptNumber: '' },
        uniforms: [],
      });
    } catch (error: any) {
      toast.error('Registration failed', {
        description: error.message || 'Check database stock levels.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-none">
      <div>
        <h1 className="font-['Space_Grotesk'] text-3xl mb-2">Student Intake</h1>
      </div>

      <GlassCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2.1fr)]">
            <div className="space-y-6">
              {/* Student Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="font-['Inter']">
                  Student Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Tanaka Moyo"
                  className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#10B981] dark:focus:ring-[#10B981] bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]"
                  required
                  autoFocus
                  autoComplete="off"
                />
              </div>

              {/* Grade */}
              <div className="space-y-2">
                <Label htmlFor="grade" className="font-['Inter'] text-zinc-950 dark:text-zinc-50">
                  Grade/Form
                </Label>
                <select
                  id="grade"
                  value={formData.grade}
                  onChange={(e) => {
                    const newGrade = e.target.value;
                    const isECD = newGrade === 'ECD A' || newGrade === 'ECD B';
                    setFormData({ ...formData, grade: newGrade });
                    setSelectedItems(prev => ({
                      ...prev,
                      relish: { 
                        ...prev.relish, 
                        selected: isECD ? prev.relish.selected : false // Auto-deselect relish for non-ECD grades
                      }
                    }));
                  }}
                  className="w-full text-sm p-3 rounded-[20px] bg-background border border-border outline-none font-['Inter'] focus:border-[#10B981] dark:text-zinc-50 text-zinc-950"
                  required
                >
                  <option value="">Select Grade...</option>
                  {['ECD A', 'ECD B', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Parent Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="parentPhone" className="font-['Inter']">
                  Parent Phone Number
                </Label>
                <Input
                  id="parentPhone"
                  value={formData.parentPhoneNumber}
                  onChange={(e) => setFormData({ ...formData, parentPhoneNumber: e.target.value })}
                  placeholder="e.g., +263 771 234 567"
                  className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#10B981] dark:focus:ring-[#10B981] bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]"
                  required
                />
              </div>

              {/* Registration Fee Amount */}
              <div className="space-y-2">
                <Label htmlFor="regFeeAmount" className="font-['Inter']">
                  Registration fee ($)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="regFeeAmount"
                    type="text"
                    value={formData.registrationFeeAmount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      setFormData({ ...formData, registrationFeeAmount: value });
                    }}
                    placeholder="Enter Registration fee"
                    className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#10B981] dark:focus:ring-[#10B981] bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981] flex-1"
                    required
                  />
                  <Button
                    type="button"
                    onClick={setAsDefaultRegistrationFee}
                    variant="outline"
                    className="rounded-[20px] font-['Inter'] border-gray-200 hover:bg-gray-50 whitespace-nowrap"
                    title="Set this amount as default for future registrations"
                  >
                    Set Default
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground font-['Inter']">
                  Current default: ${defaultRegistrationFee.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Payment Cards */}
              <div className="space-y-4">
                <Label className="font-['Space_Grotesk'] text-lg text-zinc-950 dark:text-zinc-50">Payment Items</Label>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    {/* Tuition Card */}
                    <motion.div
                      className={`p-4 rounded-[20px] border-2 transition-all cursor-pointer ${
                        selectedItems.tuition.selected
                          ? getTuitionBookTypeLabel(formData.grade) === 'Primary'
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400'
                            : 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-400'
                          : getTuitionBookTypeLabel(formData.grade) === 'Primary'
                            ? 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500'
                            : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-green-300 dark:hover:border-green-500'
                      }`}
                      onClick={() => {
                        setSelectedItems(prev => ({
                          ...prev,
                          tuition: {
                            ...prev.tuition,
                            selected: !prev.tuition.selected,
                            amount: !prev.tuition.selected ? prev.tuition.defaultAmount : 0
                          }
                        }));
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-full ${
                            getTuitionBookTypeLabel(formData.grade) === 'Primary'
                              ? selectedItems.tuition.selected
                                ? 'bg-blue-500 text-white'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                              : selectedItems.tuition.selected
                                ? 'bg-green-500 text-white'
                                : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          }`}>
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-['Space_Grotesk'] font-semibold text-sm leading-tight text-zinc-950 dark:text-zinc-50">
                              {getTuitionBookTypeLabel(formData.grade) === 'Primary' ? 'Primary School Fees' : 'Secondary School Fees'}
                            </h3>
                            <p className="text-xs text-muted-foreground font-['Inter']">
                              <span className="font-bold text-zinc-700 dark:text-zinc-200">{currentPaymentMonth}</span>, Tuition
                            </p>
                            {selectedItems.tuition.receiptNumber && (
                              <p className={`text-xs font-['Inter'] font-medium mt-1 ${
                                getTuitionBookTypeLabel(formData.grade) === 'Primary'
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-green-600 dark:text-green-400'
                              }`}>
                                Receipt: #{selectedItems.tuition.receiptNumber}
                              </p>
                            )}
                            {!selectedItems.tuition.selected && receiptPreviews.tuition && (
                              <p className="text-xs font-['Inter'] text-muted-foreground mt-1">
                                Next: #{receiptPreviews.tuition}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedItems.tuition.selected && (
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-['Inter'] text-muted-foreground uppercase tracking-wide">Receipt</span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={receiptDrafts.tuition ?? (selectedItems.tuition.receiptNumber || receiptPreviews.tuition)}
                                  onChange={(e) => handleReceiptValueChange('tuition', e.target.value)}
                                  className="w-20 h-6 text-xs rounded-[8px]"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              {receiptChangeRequests.tuition && (
                                <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50/80 p-2 dark:border-amber-700/60 dark:bg-amber-900/10">
                                  <p className="text-[10px] font-['Inter'] text-amber-800 dark:text-amber-300">
                                    Change receipt from <span className="font-bold">{receiptChangeRequests.tuition.current || '—'}</span> to <span className="font-bold">{receiptChangeRequests.tuition.next}</span>
                                  </p>
                                  <Input
                                    value={receiptChangeActors.tuition || ''}
                                    onChange={(e) => setReceiptChangeActors(prev => ({ ...prev, tuition: e.target.value }))}
                                    placeholder="Changed by"
                                    className="h-8 text-[11px] rounded-md"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <textarea
                                    value={receiptChangeReasons.tuition || ''}
                                    onChange={(e) => setReceiptChangeReasons(prev => ({ ...prev, tuition: e.target.value }))}
                                    placeholder="Write why this receipt number is being changed"
                                    className="min-h-[60px] w-full resize-none rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] text-zinc-700 outline-none focus:border-amber-500 dark:border-amber-700 dark:bg-zinc-950 dark:text-zinc-100"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-7 px-2 text-[10px]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        applyReceiptChange('tuition');
                                      }}
                                      disabled={!receiptChangeActors.tuition?.trim() || !receiptChangeReasons.tuition?.trim()}
                                    >
                                      Apply
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-[10px]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        resetReceiptChange('tuition');
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={selectedItems.tuition.amount}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    setSelectedItems(prev => ({
                                      ...prev,
                                      tuition: { ...prev.tuition, amount: value }
                                    }));
                                  }}
                                  className="w-20 h-8 text-sm rounded-[12px]"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className="text-sm font-semibold">$</span>
                              </div>
                            </div>
                          )}
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            getTuitionBookTypeLabel(formData.grade) === 'Primary'
                              ? selectedItems.tuition.selected
                                ? 'bg-blue-500 border-blue-500 text-white'
                                : 'border-gray-300 dark:border-white/20'
                              : selectedItems.tuition.selected
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 dark:border-white/20'
                          }`}>
                            {selectedItems.tuition.selected && <div className="w-3 h-3 bg-white rounded-full" />}
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Transport Card */}
                    <motion.div
                      className={`p-4 rounded-[20px] border-2 transition-all cursor-pointer ${
                        selectedItems.transport.selected
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-400'
                          : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-green-300 dark:hover:border-green-500'
                      }`}
                      onClick={() => {
                        setSelectedItems(prev => ({
                          ...prev,
                          transport: {
                            ...prev.transport,
                            selected: !prev.transport.selected,
                            amount: !prev.transport.selected ? prev.transport.defaultAmount : 0
                          }
                        }));
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-full ${
                            selectedItems.transport.selected
                              ? 'bg-green-500 text-white'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          }`}>
                            <Bus className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-['Space_Grotesk'] font-semibold text-sm leading-tight text-zinc-950 dark:text-zinc-50">Transport Fee</h3>
                            <p className="text-xs text-muted-foreground font-['Inter']">
                              <span className="font-bold text-zinc-700 dark:text-zinc-200">{currentPaymentMonth}</span>, Transport
                            </p>
                            {selectedItems.transport.receiptNumber && (
                              <p className="text-xs font-['Inter'] text-green-600 dark:text-green-400 font-medium mt-1">
                                Receipt: #{selectedItems.transport.receiptNumber}
                              </p>
                            )}
                            {!selectedItems.transport.selected && receiptPreviews.transport && (
                              <p className="text-xs font-['Inter'] text-muted-foreground mt-1">
                                Next: #{receiptPreviews.transport}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedItems.transport.selected && (
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-['Inter'] text-muted-foreground uppercase tracking-wide">Receipt</span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={receiptDrafts.transport ?? (selectedItems.transport.receiptNumber || receiptPreviews.transport)}
                                  onChange={(e) => handleReceiptValueChange('transport', e.target.value)}
                                  className="w-20 h-6 text-xs rounded-[8px]"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              {receiptChangeRequests.transport && (
                                <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50/80 p-2 dark:border-amber-700/60 dark:bg-amber-900/10">
                                  <p className="text-[10px] font-['Inter'] text-amber-800 dark:text-amber-300">
                                    Change receipt from <span className="font-bold">{receiptChangeRequests.transport.current || '—'}</span> to <span className="font-bold">{receiptChangeRequests.transport.next}</span>
                                  </p>
                                  <Input
                                    value={receiptChangeActors.transport || ''}
                                    onChange={(e) => setReceiptChangeActors(prev => ({ ...prev, transport: e.target.value }))}
                                    placeholder="Changed by"
                                    className="h-8 text-[11px] rounded-md"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <textarea
                                    value={receiptChangeReasons.transport || ''}
                                    onChange={(e) => setReceiptChangeReasons(prev => ({ ...prev, transport: e.target.value }))}
                                    placeholder="Write why this receipt number is being changed"
                                    className="min-h-[60px] w-full resize-none rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] text-zinc-700 outline-none focus:border-amber-500 dark:border-amber-700 dark:bg-zinc-950 dark:text-zinc-100"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-7 px-2 text-[10px]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        applyReceiptChange('transport');
                                      }}
                                      disabled={!receiptChangeActors.transport?.trim() || !receiptChangeReasons.transport?.trim()}
                                    >
                                      Apply
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-[10px]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        resetReceiptChange('transport');
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={selectedItems.transport.amount}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    setSelectedItems(prev => ({
                                      ...prev,
                                      transport: { ...prev.transport, amount: value }
                                    }));
                                  }}
                                  className="w-20 h-8 text-sm rounded-[12px]"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className="text-sm font-semibold">$</span>
                              </div>
                            </div>
                          )}
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedItems.transport.selected
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 dark:border-white/20'
                          }`}>
                            {selectedItems.transport.selected && <div className="w-3 h-3 bg-white rounded-full" />}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  <div className="space-y-4">
                    {/* Relish Card - Only for ECD A or ECD B */}
                    {(formData.grade === 'ECD A' || formData.grade === 'ECD B') && (
                      <motion.div
                        className={`p-4 rounded-[20px] border-2 transition-all cursor-pointer ${
                          selectedItems.relish.selected
                            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 dark:border-orange-400'
                            : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-orange-300 dark:hover:border-orange-500'
                        }`}
                        onClick={() => {
                          setSelectedItems(prev => ({
                            ...prev,
                            relish: {
                              ...prev.relish,
                              selected: !prev.relish.selected,
                              amount: !prev.relish.selected ? prev.relish.defaultAmount : 0
                            }
                          }));
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-full ${
                              selectedItems.relish.selected
                                ? 'bg-orange-500 text-white'
                                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                            }`}>
                              <Utensils className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-['Space_Grotesk'] font-semibold text-sm leading-tight text-zinc-950 dark:text-zinc-50">Relish Fee</h3>
                              <p className="text-xs text-muted-foreground font-['Inter']">
                                <span className="font-bold text-zinc-700 dark:text-zinc-200">{currentPaymentMonth}</span>, Relish
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedItems.relish.selected && (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={selectedItems.relish.amount}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    setSelectedItems(prev => ({
                                      ...prev,
                                      relish: { ...prev.relish, amount: value }
                                    }));
                                  }}
                                  className="w-20 h-8 text-sm rounded-[12px]"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className="text-sm font-semibold">$</span>
                              </div>
                            )}
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              selectedItems.relish.selected
                                ? 'bg-orange-500 border-orange-500 text-white'
                                : 'border-gray-300 dark:border-white/20'
                            }`}>
                              {selectedItems.relish.selected && <div className="w-3 h-3 bg-white rounded-full" />}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Uniform Card */}
                    {formData.grade ? (
                      <Dialog open={uniformModalOpen} onOpenChange={setUniformModalOpen}>
                        <DialogTrigger asChild>
                          <div className="cursor-pointer">
                            <motion.div
                              className={`p-4 rounded-[20px] border-2 transition-all ${
                                selectedItems.uniforms.length > 0
                                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 dark:border-purple-400'
                                  : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-500'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`p-3 rounded-full ${
                                    selectedItems.uniforms.length > 0
                                      ? 'bg-purple-500 text-white'
                                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                  }`}>
                                    <Shirt className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h3 className="font-['Space_Grotesk'] font-semibold text-sm leading-tight text-zinc-950 dark:text-zinc-50">Uniform Items</h3>
                                    <p className="text-xs text-muted-foreground font-['Inter']">
                                      {selectedItems.uniforms.length > 0
                                        ? `${selectedItems.uniforms.length} item(s) selected`
                                        : 'Click to select uniforms'
                                      }
                                    </p>
                                    {selectedItems.uniforms.length > 0 && (
                                      <>
                                        <div className="mt-2 flex items-center gap-2">
                                          <span className="text-[10px] font-['Inter'] text-muted-foreground uppercase tracking-wide">Receipt</span>
                                          <Input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={receiptDrafts.uniform ?? (selectedItems.uniforms[0]?.receiptNumber || receiptPreviews.uniform)}
                                            onChange={(e) => handleReceiptValueChange('uniform', e.target.value)}
                                            className="w-20 h-6 text-xs rounded-[8px]"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </div>
                                        {receiptChangeRequests.uniform && (
                                          <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50/80 p-2 dark:border-amber-700/60 dark:bg-amber-900/10">
                                            <p className="text-[10px] font-['Inter'] text-amber-800 dark:text-amber-300">
                                              Change receipt from <span className="font-bold">{receiptChangeRequests.uniform.current || '—'}</span> to <span className="font-bold">{receiptChangeRequests.uniform.next}</span>
                                            </p>
                                            <Input
                                              value={receiptChangeActors.uniform || ''}
                                              onChange={(e) => setReceiptChangeActors(prev => ({ ...prev, uniform: e.target.value }))}
                                              placeholder="Changed by"
                                              className="h-8 text-[11px] rounded-md"
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                            <textarea
                                              value={receiptChangeReasons.uniform || ''}
                                              onChange={(e) => setReceiptChangeReasons(prev => ({ ...prev, uniform: e.target.value }))}
                                              placeholder="Write why this receipt number is being changed"
                                              className="min-h-[60px] w-full resize-none rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] text-zinc-700 outline-none focus:border-amber-500 dark:border-amber-700 dark:bg-zinc-950 dark:text-zinc-100"
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className="flex gap-2">
                                              <Button
                                                type="button"
                                                size="sm"
                                                className="h-7 px-2 text-[10px]"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  applyReceiptChange('uniform');
                                                }}
                                                disabled={!receiptChangeActors.uniform?.trim() || !receiptChangeReasons.uniform?.trim()}
                                              >
                                                Apply
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-2 text-[10px]"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  resetReceiptChange('uniform');
                                                }}
                                              >
                                                Cancel
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {selectedItems.uniforms.length > 0 && (
                                    <span className="text-sm font-semibold">
                                      ${selectedItems.uniforms.reduce((sum, u) => sum + u.amount, 0).toFixed(2)}
                                    </span>
                                  )}
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                    selectedItems.uniforms.length > 0
                                      ? 'bg-purple-500 border-purple-500 text-white'
                                      : 'border-gray-300 dark:border-white/20'
                                  }`}>
                                    {selectedItems.uniforms.length > 0 && <div className="w-3 h-3 bg-white rounded-full" />}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="font-['Space_Grotesk']">Select Uniform Items</DialogTitle>
                          </DialogHeader>
                          <UniformSelector
                            grade={formData.grade}
                            selectedUniforms={selectedItems.uniforms}
                            onUniformSelect={(uniform) => {
                              setSelectedItems(prev => ({
                                ...prev,
                                uniforms: [...prev.uniforms, { ...uniform, receiptNumber: '' }]
                              }));
                            }}
                            onUniformRemove={(uniformId, sizeId) => {
                              setSelectedItems(prev => ({
                                ...prev,
                                uniforms: prev.uniforms.filter(u => !(u.uniformId === uniformId && u.sizeId === sizeId))
                              }));
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <div className="p-4 rounded-[20px] bg-zinc-100 dark:bg-zinc-900/20 text-center text-sm font-['Inter'] text-muted-foreground border-2 border-dashed border-border">
                        Please select a grade/form to unlock uniform selections
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Cart Display Section */}
              <div className="p-4 rounded-[20px] bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-2 border-gray-200 dark:border-gray-700">
                <h3 className="font-['Space_Grotesk'] text-lg font-semibold mb-3 text-gray-600 dark:text-gray-400">Payment Cart</h3>
                <div className="space-y-2">
                  {/* Registration Fee */}
                  {formData.registrationFeeAmount && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="font-['Inter']">Registration Fee</span>
                        {registrationReceiptNumber && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">Receipt: #{registrationReceiptNumber}</span>
                        )}
                      </div>
                      <span className="font-semibold font-['Space_Grotesk']">${formData.registrationFeeAmount}</span>
                    </div>
                  )}
                  {/* Tuition */}
                  {selectedItems.tuition.selected && (
                    <div className={`flex items-center justify-between text-sm rounded-xl border border-l-4 px-3 py-2 ${
                      getTuitionBookTypeLabel(formData.grade) === 'Primary'
                        ? 'border-l-blue-500 bg-blue-50/80 dark:bg-blue-900/10'
                        : 'border-l-green-500 bg-green-50/80 dark:bg-green-900/10'
                    }`}>
                      <div className="flex flex-col">
                        <span className="font-['Inter']">Tuition Fee</span>
                        {selectedItems.tuition.receiptNumber && (
                          <span className={`text-xs ${
                            getTuitionBookTypeLabel(formData.grade) === 'Primary'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}>Receipt: #{selectedItems.tuition.receiptNumber}</span>
                        )}
                      </div>
                      <span className="font-semibold font-['Space_Grotesk']">${selectedItems.tuition.amount.toFixed(2)}</span>
                    </div>
                  )}
                  {/* Transport */}
                  {selectedItems.transport.selected && (
                    <div className="flex items-center justify-between text-sm rounded-xl border border-l-4 border-l-green-500 bg-green-50/80 dark:bg-green-900/10 px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-['Inter']">Transport Fee</span>
                        {selectedItems.transport.receiptNumber && (
                          <span className="text-xs text-green-600 dark:text-green-400">Receipt: #{selectedItems.transport.receiptNumber}</span>
                        )}
                      </div>
                      <span className="font-semibold font-['Space_Grotesk']">${selectedItems.transport.amount.toFixed(2)}</span>
                    </div>
                  )}
                  {/* Relish */}
                  {selectedItems.relish.selected && (
                    <div className="flex items-center justify-between text-sm rounded-xl border border-l-4 border-l-orange-500 bg-orange-50/80 dark:bg-orange-900/10 px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-['Inter']">Relish Fee</span>
                      </div>
                      <span className="font-semibold font-['Space_Grotesk']">${selectedItems.relish.amount.toFixed(2)}</span>
                    </div>
                  )}
                  {/* Uniforms */}
                  {selectedItems.uniforms.length > 0 && (
                    <div className="space-y-1">
                      {selectedItems.uniforms.map((uniform) => (
                        <div key={`${uniform.uniformId}-${uniform.sizeId}`} className="flex items-center justify-between text-sm rounded-xl border border-l-4 border-l-purple-500 bg-purple-50/80 dark:bg-purple-900/10 px-3 py-2">
                          <div className="flex flex-col">
                            <span className="font-['Inter']">{uniform.name} (Size {uniform.sizeLabel})</span>
                            {uniform.receiptNumber && (
                              <span className="text-xs text-purple-600 dark:text-purple-400">Receipt: #{uniform.receiptNumber}</span>
                            )}
                          </div>
                          <span className="font-semibold font-['Space_Grotesk']">${uniform.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Total */}
                  <div className="pt-2 mt-2 border-t border-gray-300 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="font-['Space_Grotesk'] font-semibold text-gray-600 dark:text-gray-400">Total</span>
                      <span className="text-xl font-bold font-['Space_Grotesk'] text-gray-600 dark:text-gray-400">
                        ${totalPaymentAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-[20px] bg-[#10B981] hover:bg-[#059669] text-white h-12 font-['Space_Grotesk'] flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {submitting ? 'Registering Student...' : 'Register Student'}
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
