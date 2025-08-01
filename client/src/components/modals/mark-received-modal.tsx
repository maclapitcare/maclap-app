import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface MarkReceivedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (receiver: string, date: string) => void;
  pendingPayment?: any;
}

export function MarkReceivedModal({ isOpen, onClose, onConfirm, pendingPayment }: MarkReceivedModalProps) {
  const [receiver, setReceiver] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);

  const handleConfirm = () => {
    if (receiver && receivedDate) {
      onConfirm(receiver, receivedDate);
      onClose();
      setReceiver("");
      setReceivedDate(new Date().toISOString().split('T')[0]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Payment as Received</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-gray-600 mb-2 block">Who received this payment?</Label>
            <RadioGroup value={receiver} onValueChange={setReceiver}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Puneet" id="puneet" />
                <Label htmlFor="puneet">Puneet</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Sonu" id="sonu" />
                <Label htmlFor="sonu">Sonu</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div>
            <Label htmlFor="receivedDate" className="text-sm font-medium text-gray-700 mb-1 block">
              Date Received
            </Label>
            <Input
              id="receivedDate"
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex space-x-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            className="flex-1 bg-green-600 hover:bg-green-700"
            disabled={!receiver}
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
