import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc } from "firebase/firestore";
import { PendingPayment, insertPendingPaymentSchema, insertTransactionSchema } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MarkReceivedModal } from "@/components/modals/mark-received-modal";

export default function PendingPayments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: "",
    remark: ""
  });

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      query(collection(db, "pending"), orderBy("timestamp", "desc")),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PendingPayment));
        setPendingPayments(data);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const paymentData = {
        ...formData,
        amount: parseFloat(formData.amount),
        user: user.name,
        timestamp: Date.now()
      };

      const validatedData = insertPendingPaymentSchema.parse(paymentData);
      
      await addDoc(collection(db, "pending"), validatedData);
      
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: "",
        remark: ""
      });

      toast({
        title: "Pending payment added",
        description: "Pending payment has been saved successfully.",
      });
    } catch (error) {
      console.error("Error adding pending payment:", error);
      toast({
        title: "Error",
        description: "Failed to add pending payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMarkReceived = (payment: PendingPayment) => {
    setSelectedPayment(payment);
    setModalOpen(true);
  };

  const handleConfirmReceived = async (receiver: string, receivedDate: string) => {
    if (!selectedPayment) return;

    try {
      // Add to transactions
      const transactionData = {
        date: receivedDate,
        type: "in" as const,
        amount: selectedPayment.amount,
        remark: `${selectedPayment.remark} (from pending)`,
        user: receiver,
        timestamp: Date.now()
      };

      const validatedTransaction = insertTransactionSchema.parse(transactionData);
      await addDoc(collection(db, "transactions"), validatedTransaction);

      // Remove from pending
      await deleteDoc(doc(db, "pending", selectedPayment.id));

      toast({
        title: "Payment marked as received",
        description: `Payment of ₹${selectedPayment.amount} has been added to transactions.`,
      });

      setSelectedPayment(null);
    } catch (error) {
      console.error("Error marking payment as received:", error);
      toast({
        title: "Error",
        description: "Failed to mark payment as received. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Pending Payments</h2>
      </div>

      {/* Add Pending Payment Form */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Add Pending Payment</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount (₹)
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <Label htmlFor="remark" className="block text-sm font-medium text-gray-700 mb-1">
                Remark
              </Label>
              <Input
                id="remark"
                type="text"
                placeholder="Payment description"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
                <Plus size={16} className="mr-2" />
                Add Pending
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Pending Payments List */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Pending Payments List</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Remark</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No pending payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.date}</TableCell>
                      <TableCell className="font-medium text-orange-600">
                        ₹{payment.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{payment.remark}</TableCell>
                      <TableCell>{payment.user}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="flex items-center w-fit">
                          <Clock size={12} className="mr-1" />
                          Pending
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleMarkReceived(payment)}
                        >
                          Mark Received
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <MarkReceivedModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmReceived}
        pendingPayment={selectedPayment}
      />
    </div>
  );
}
