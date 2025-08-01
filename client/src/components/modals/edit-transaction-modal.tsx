import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string, updatedData: { type: string; amount: number; remark: string; user: string }) => void;
  transaction?: any;
}

export function EditTransactionModal({ isOpen, onClose, onConfirm, transaction }: EditTransactionModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    type: 'in',
    amount: '',
    remark: '',
    user: 'Puneet'
  });

  useEffect(() => {
    if (transaction) {
      setForm({
        type: transaction.type || 'in',
        amount: transaction.amount?.toString() || '',
        remark: transaction.remark || '',
        user: transaction.user || 'Puneet'
      });
    }
  }, [transaction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive"
      });
      return;
    }

    if (!form.remark.trim()) {
      toast({
        title: "Remark Required",
        description: "Please enter a remark for this transaction",
        variant: "destructive"
      });
      return;
    }

    onConfirm(transaction.id, {
      type: form.type,
      amount: parseFloat(form.amount),
      remark: form.remark.trim(),
      user: form.user
    });

    // Reset form
    setForm({
      type: 'in',
      amount: '',
      remark: '',
      user: 'Puneet'
    });
    
    onClose();
  };

  const handleCancel = () => {
    setForm({
      type: 'in',
      amount: '',
      remark: '',
      user: 'Puneet'
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Edit Transaction
          </DialogTitle>
          <DialogDescription>
            Modify transaction details including amount, type, remark, and user assignment. Only today's transactions can be edited.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-medium">
              Transaction Type
            </Label>
            <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">Cash In</SelectItem>
                <SelectItem value="out">Cash Out</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">
              Amount (₹)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="Enter amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remark" className="text-sm font-medium">
              Remark
            </Label>
            <Input
              id="remark"
              placeholder="Enter remark"
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user" className="text-sm font-medium">
              Assign To User
            </Label>
            <Select value={form.user} onValueChange={(value) => setForm({ ...form, user: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Puneet">Puneet</SelectItem>
                <SelectItem value="Sonu">Sonu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Update Transaction
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}