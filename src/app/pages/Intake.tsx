import { useState } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Student } from '../data/mockData';

export function Intake() {
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    registrationFeeAmount: '',
    tuitionFeeAmount: '',
    receiptNumber: '',
    isTransfer: false,
    previousSchool: '',
    parentPhoneNumber: '',
    parentHasWhatsApp: false,
    whatsappContactName: '',
  });

  const [defaultRegistrationFee, setDefaultRegistrationFee] = useState(20);
  const [nextReceiptNumber, setNextReceiptNumber] = useState(1);

  // Generate receipt number
  const generateReceiptNumber = () => {
    const receiptNumber = nextReceiptNumber.toString().padStart(4, '0');
    setNextReceiptNumber(prev => prev + 1);
    return receiptNumber;
  };

  // Calculate total payment amount
  const totalPaymentAmount = (parseFloat(formData.registrationFeeAmount) || 0) + (parseFloat(formData.tuitionFeeAmount) || 0);

  // Set registration fee as default
  const setAsDefaultRegistrationFee = () => {
    setDefaultRegistrationFee(parseFloat(formData.registrationFeeAmount) || 20);
    toast.success('Registration fee set as default!');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if registration fee is paid (has amount entered)
    if (!formData.registrationFeeAmount || parseFloat(formData.registrationFeeAmount) <= 0) {
      toast.error('Pay registration fee in order to register!');
      return;
    }
    
    // Generate WhatsApp contact name if not provided
    const whatsappContactName = formData.whatsappContactName || `${formData.name.replace(/\s+/g, '')}_${formData.grade.replace(/\s+/g, '')}`;
    
    // Simulate success
    toast.success(`Success: ${formData.name} registered!`, {
      description: `Student added to ${formData.grade} - Parent: ${formData.parentPhoneNumber}`,
    });

    // Reset form
    setFormData({
      name: '',
      grade: '',
      registrationFeeAmount: '',
      tuitionFeeAmount: '',
      receiptNumber: '',
      isTransfer: false,
      previousSchool: '',
      parentPhoneNumber: '',
      parentHasWhatsApp: false,
      whatsappContactName: '',
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-['Space_Grotesk'] text-3xl mb-2">Student Intake</h1>
        <p className="text-muted-foreground font-['Inter']">
          High-speed student registration optimized for flow state
        </p>
      </div>

      <GlassCard>
        <form onSubmit={handleSubmit} className="space-y-6">
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
            />
          </div>

          {/* Grade */}
          <div className="space-y-2">
            <Label htmlFor="grade" className="font-['Inter']">
              Grade/Form
            </Label>
            <Input
              id="grade"
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              placeholder="e.g., Form 4"
              className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#10B981] dark:focus:ring-[#10B981] bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]"
              required
            />
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

          {/* WhatsApp Status */}
          <div className="flex items-center justify-between p-4 rounded-[20px] dark:bg-white/5 dark:border dark:border-white/10 bg-gray-50 border border-gray-200">
            <div className="space-y-0.5">
              <Label htmlFor="whatsapp" className="font-['Inter']">
                Parent has WhatsApp
              </Label>
              <p className="text-xs text-muted-foreground font-['Inter']">
                Check if parent uses WhatsApp for communication
              </p>
            </div>
            <Switch
              id="whatsapp"
              checked={formData.parentHasWhatsApp}
              onCheckedChange={(checked) => {
                setFormData({ ...formData, parentHasWhatsApp: checked });
                // Auto-generate WhatsApp contact name when enabled
                if (checked && formData.name && formData.grade) {
                  const contactName = `${formData.name.replace(/\s+/g, '')}_${formData.grade.replace(/\s+/g, '')}`;
                  setFormData(prev => ({ ...prev, parentHasWhatsApp: checked, whatsappContactName: contactName }));
                }
              }}
              className="data-[state=checked]:bg-[#10B981]"
            />
          </div>

          {/* WhatsApp Contact Name - Conditional */}
          {formData.parentHasWhatsApp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Label htmlFor="whatsappName" className="font-['Inter']">
                WhatsApp Contact Name
              </Label>
              <Input
                id="whatsappName"
                value={formData.whatsappContactName}
                onChange={(e) => setFormData({ ...formData, whatsappContactName: e.target.value })}
                placeholder={`Auto-generated: ${formData.name.replace(/\s+/g, '')}_${formData.grade.replace(/\s+/g, '')}`}
                className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#10B981] dark:focus:ring-[#10B981] bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]"
              />
              <p className="text-xs text-muted-foreground font-['Inter']">
                Format: StudentName_Grade/Form (auto-generated if left empty)
              </p>
            </motion.div>
          )}

          {/* Transfer Student Toggle */}
          <div className="flex items-center justify-between p-4 rounded-[20px] dark:bg-white/5 dark:border dark:border-white/10 bg-gray-50 border border-gray-200">
            <div className="space-y-0.5">
              <Label htmlFor="transfer" className="font-['Inter']">
                Is Transfer Student
              </Label>
              <p className="text-xs text-muted-foreground font-['Inter']">
                Check if student is transferring from another school
              </p>
            </div>
            <Checkbox
              id="transfer"
              checked={formData.isTransfer}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isTransfer: checked as boolean })
              }
            />
          </div>

          {/* Conditional Previous School Input */}
          {formData.isTransfer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Label htmlFor="previousSchool" className="font-['Inter']">
                Previous School
              </Label>
              <Input
                id="previousSchool"
                value={formData.previousSchool}
                onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                placeholder="e.g., St. Peters High"
                className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#10B981] dark:focus:ring-[#10B981] bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]"
              />
            </motion.div>
          )}

          {/* Receipt Number */}
          <div className="space-y-2">
            <Label htmlFor="receiptNumber" className="font-['Inter']">
              Receipt Number
            </Label>
            <div className="flex gap-2">
              <Input
                id="receiptNumber"
                value={formData.receiptNumber}
                onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                placeholder="Enter receipt number"
                className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#10B981] dark:focus:ring-[#10B981] bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]"
                required
              />
              <Button
                type="button"
                onClick={() => setFormData({ ...formData, receiptNumber: generateReceiptNumber() })}
                variant="outline"
                className="rounded-[20px] font-['Inter'] border-gray-200 hover:bg-gray-50"
              >
                Generate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground font-['Inter']">
              Click "Generate" for automatic receipt number
            </p>
          </div>

          {/* Tuition Fee Amount */}
          <div className="space-y-2">
            <Label htmlFor="tuitionFeeAmount" className="font-['Inter']">
              Enter Tuition fee ($)
            </Label>
            <Input
              id="tuitionFeeAmount"
              type="text"
              value={formData.tuitionFeeAmount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.]/g, '');
                setFormData({ ...formData, tuitionFeeAmount: value });
              }}
              placeholder="Enter Tuition fee"
              className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#10B981] dark:focus:ring-[#10B981] bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]"
              required
            />
          </div>

          {/* Total Payment Amount - Display Only */}
          <div className="p-4 rounded-[20px] bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="font-['Space_Grotesk'] text-lg text-blue-600 dark:text-blue-400">
                  Total Payment Amount
                </Label>
                <p className="text-sm text-muted-foreground font-['Inter']">
                  Registration Fee + Tuition Fee
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold font-['Space_Grotesk'] text-blue-600 dark:text-blue-400">
                  ${totalPaymentAmount.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground font-['Inter']">
                  ${formData.registrationFeeAmount || '0'} + ${formData.tuitionFeeAmount || '0'}
                </p>
              </div>
            </div>
          </div>

          {/* Registration Fee Amount */}
          <div className="space-y-2">
            <Label htmlFor="regFeeAmount" className="font-['Inter']">
              Enter Registration fee ($)
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

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full rounded-[20px] bg-[#10B981] hover:bg-[#059669] text-white h-12 font-['Space_Grotesk']"
          >
            Register Student
          </Button>
        </form>
      </GlassCard>

      {/* Quick Tips */}
      <GlassCard>
        <h3 className="font-['Space_Grotesk'] text-lg mb-3">⚡ Quick Tips</h3>
        <ul className="space-y-2 text-sm text-muted-foreground font-['Inter']">
          <li>• Press <kbd className="px-2 py-1 bg-white/10 rounded">Tab</kbd> to navigate between fields</li>
          <li>• Registration fee amount is fully adjustable</li>
          <li>• WhatsApp contact name auto-generates as StudentName_Grade</li>
          <li>• Parent phone number is required for all students</li>
          <li>• Transfer students automatically trigger additional fields</li>
        </ul>
      </GlassCard>
    </div>
  );
}
