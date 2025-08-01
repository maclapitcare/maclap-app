import { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, addDoc, orderBy, query, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ArrowUp, ArrowDown, User, Clock, LogOut, FileText, Calendar, Filter, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { storeOfflineData, isOnline } from "@/lib/offline";
import { soundManager } from "@/lib/sounds";
import { EditTransactionModal } from "@/components/modals/edit-transaction-modal";

export default function Transactions() {
  const { user, logout, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  

  const [transactions, setTransactions] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    type: "in",
    date: new Date().toISOString().split('T')[0],
    amount: "",
    remark: ""
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPendingSubmitting, setIsPendingSubmitting] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const remarkInputRef = useRef<HTMLInputElement>(null);
  const lastSubmissionRef = useRef<number>(0);

  useEffect(() => {
    if (!user) return;

    const transactionsQuery = query(
      collection(db, "transactions"),
      orderBy("timestamp", "desc")
    );

    const pendingQuery = query(
      collection(db, "pendingPayments"),
      orderBy("timestamp", "desc")
    );

    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transactionList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(transactionList);
      setLoading(false);
    });

    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
      const pendingList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingPayments(pendingList);
    });

    return () => {
      unsubscribeTransactions();
      unsubscribePending();
    };
  }, [user]);

  // Filter transactions by selected date
  const filteredTransactions = transactions?.filter(transaction => 
    transaction.date === selectedDate
  ) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (isSubmitting) {
      return;
    }

    // Prevent rapid consecutive submissions (within 2 seconds)
    const now = Date.now();
    if (now - lastSubmissionRef.current < 2000) {
      toast({
        title: "Please Wait",
        description: "Previous transaction is still being processed",
        variant: "destructive"
      });
      return;
    }
    
    if (!form.amount || !form.remark) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    lastSubmissionRef.current = now;
    
    const transactionData = {
      type: form.type,
      amount: parseFloat(form.amount),
      remark: form.remark,
      date: form.date,
      user: user?.name || "Unknown",
      timestamp: now
    };

    try {
      if (isOnline()) {
        await addDoc(collection(db, "transactions"), transactionData);
        toast({
          title: "Transaction Added",
          description: `₹${form.amount} ${form.type === "in" ? "received" : "paid"} successfully`,
        });
      } else {
        await storeOfflineData('transaction', transactionData);
        toast({
          title: "Saved Offline",
          description: "Transaction will sync when online",
        });
      }

      // Play appropriate sound based on transaction type
      if (form.type === "in") {
        soundManager.playCashInSound();
      } else {
        soundManager.playCashOutSound();
      }

      // Reset form
      setForm({
        type: "in",
        date: new Date().toISOString().split('T')[0],
        amount: "",
        remark: ""
      });

      // Focus back to amount input
      if (amountInputRef.current) {
        amountInputRef.current.focus();
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAmount = (amount: number) => {
    setForm(prev => ({ ...prev, amount: amount.toString() }));
    soundManager.playClickSound(); // Add click feedback
    if (remarkInputRef.current) {
      remarkInputRef.current.focus();
    }
  };

  const handlePendingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isPendingSubmitting) {
      return;
    }
    
    setIsPendingSubmitting(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    const pendingData = {
      to: formData.get('to') as string,
      amount: parseFloat(formData.get('amount') as string),
      remark: formData.get('remark') as string,
      date: formData.get('date') as string,
      user: user?.name || "Unknown",
      timestamp: Date.now()
    };

    try {
      if (isOnline()) {
        await addDoc(collection(db, "pendingPayments"), pendingData);
        toast({
          title: "Pending Payment Added",
          description: `Payment to ${pendingData.to} recorded`,
        });
      } else {
        await storeOfflineData('pendingPayment', pendingData);
        toast({
          title: "Saved Offline", 
          description: "Pending payment will sync when online",
        });
      }

      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Error adding pending payment:", error);
      toast({
        title: "Error",
        description: "Failed to add pending payment",
        variant: "destructive"
      });
    } finally {
      setIsPendingSubmitting(false);
    }
  };

  const handleDeletePendingPayment = async (paymentId: string, paymentTo: string) => {
    if (!confirm(`Are you sure you want to delete the pending payment to ${paymentTo}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "pendingPayments", paymentId));
      toast({
        title: "Payment Deleted",
        description: `Pending payment to ${paymentTo} has been removed`,
      });
    } catch (error) {
      console.error("Error deleting pending payment:", error);
      toast({
        title: "Error",
        description: "Failed to delete pending payment",
        variant: "destructive"
      });
    }
  };

  const handleEditTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowEditModal(true);
  };

  const handleUpdateTransaction = async (transactionId: string, updatedData: any) => {
    try {
      const transactionRef = doc(db, "transactions", transactionId);
      await updateDoc(transactionRef, updatedData);
      
      toast({
        title: "Transaction Updated",
        description: "Transaction has been successfully updated",
      });
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive"
      });
    }
  };

  const isToday = (dateString: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
  };

  const isYesterday = (dateString: string) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return dateString === yesterday.toISOString().split('T')[0];
  };

  const canEditOrDelete = (dateString: string) => {
    return isToday(dateString) || isYesterday(dateString);
  };

  const handleDeleteTransaction = async (transaction: any) => {
    if (!confirm(`Are you sure you want to delete this ${transaction.type === "in" ? "Cash In" : "Cash Out"} transaction of ₹${transaction.amount}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "transactions", transaction.id));
      toast({
        title: "Transaction Deleted",
        description: `₹${transaction.amount} ${transaction.type === "in" ? "Cash In" : "Cash Out"} transaction has been removed`,
      });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-3 sm:p-4 pb-20">
      {/* Header - Mobile Optimized */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate">Welcome, {user?.name}</h1>
            <p className="text-xs sm:text-sm text-gray-600">
              {isSuperAdmin() ? "Super Administrator" : "Administrator"} • Logged in as: {user?.username}
              {isSuperAdmin() && (
                <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 rounded-full text-xs font-medium">
                  Can Edit Transactions
                </span>
              )}
            </p>
          </div>
        </div>
        <Button 
          onClick={logout} 
          variant="outline" 
          size="sm"
          className="border-gray-300 hover:bg-gray-50 flex-shrink-0 ml-2"
        >
          <LogOut size={14} className="mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Logout</span>
          <span className="sm:hidden">Exit</span>
        </Button>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-sm border border-gray-200 h-10 sm:h-12">
          <TabsTrigger value="transactions" className="text-sm sm:text-base data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            Transactions
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-sm sm:text-base data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            Pending Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-6">
          {/* Quick Entry Form - Mobile Optimized */}
          <Card className="border-0 shadow-xl bg-gradient-to-r from-white via-blue-50/30 to-purple-50/30 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6 lg:p-8">
              <div className="text-center mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Quick Cash Entry
                </h2>
                <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Fast and efficient transaction recording</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <Button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, type: "in" }))}
                    className={`h-12 sm:h-16 text-sm sm:text-lg font-semibold transition-all duration-300 ${
                      form.type === "in"
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-105"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <ArrowUp className="mr-1 sm:mr-2" size={16} />
                    <span className="sm:text-lg">Cash In</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, type: "out" }))}
                    className={`h-12 sm:h-16 text-sm sm:text-lg font-semibold transition-all duration-300 ${
                      form.type === "out"
                        ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg scale-105"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <ArrowDown className="mr-1 sm:mr-2" size={16} />
                    <span className="sm:text-lg">Cash Out</span>
                  </Button>
                </div>

                <div>
                  <Label htmlFor="amount" className="text-sm sm:text-base font-medium text-gray-700">Amount</Label>
                  <Input
                    ref={amountInputRef}
                    id="amount"
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter amount"
                    className="mt-2 h-12 sm:h-14 text-lg sm:text-xl text-center font-bold bg-white/80 border-2 border-gray-200 focus:border-blue-400"
                  />
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 sm:mt-4">
                    {[1400, 1500, 1800, 2200].map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        onClick={() => handleQuickAmount(amount)}
                        className="h-10 sm:h-12 text-sm sm:text-base bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 hover:from-indigo-200 hover:to-purple-200 border border-indigo-200"
                      >
                        ₹{amount}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="remark" className="text-sm sm:text-base font-medium text-gray-700">Remark</Label>
                    <Input
                      ref={remarkInputRef}
                      id="remark"
                      value={form.remark}
                      onChange={(e) => setForm(prev => ({ ...prev, remark: e.target.value }))}
                      placeholder="Enter remark"
                      className="mt-2 h-10 sm:h-12 bg-white/80 border-2 border-gray-200 focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date" className="text-sm sm:text-base font-medium text-gray-700">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                      className="mt-2 h-10 sm:h-12 bg-white/80 border-2 border-gray-200 focus:border-blue-400"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  <Plus className="mr-2" size={18} />
                  {isSubmitting ? "Adding..." : "Add Transaction"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Today's Transactions with Date Filter */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {selectedDate === new Date().toISOString().split('T')[0] ? "Today's Transactions" : "Transactions"}
                </h3>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-500" />
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-auto text-sm border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {filteredTransactions.length} entries
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                {filteredTransactions.slice(0, 15).map((transaction: any) => (
                  <div key={transaction.id} className="bg-gradient-to-r from-white to-gray-50/80 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
                    {/* Main Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        {/* Left Side - Type Icon & Amount */}
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
                            transaction.type === "in" 
                              ? "bg-gradient-to-br from-emerald-500 to-emerald-600" 
                              : "bg-gradient-to-br from-red-500 to-red-600"
                          }`}>
                            {transaction.type === "in" ? <ArrowUp size={20} className="text-white" /> : <ArrowDown size={20} className="text-white" />}
                          </div>
                          <div>
                            <div className={`text-xl font-bold ${transaction.type === "in" ? "text-emerald-600" : "text-red-600"}`}>
                              {transaction.type === "in" ? "+" : "-"}₹{transaction.amount.toLocaleString()}
                            </div>
                            <Badge 
                              variant={transaction.type === "in" ? "default" : "destructive"}
                              className="text-xs font-medium"
                            >
                              Cash {transaction.type === "in" ? "In" : "Out"}
                            </Badge>
                          </div>
                        </div>

                        {/* Right Side - Edit/Delete Buttons */}
                        {isSuperAdmin() && canEditOrDelete(transaction.date) && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditTransaction(transaction)}
                              className="h-8 w-8 p-0 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg"
                            >
                              <Edit size={14} className="text-blue-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteTransaction(transaction)}
                              className="h-8 w-8 p-0 border-red-200 hover:border-red-400 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={14} className="text-red-600" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Remark Section */}
                      <div className="mb-3">
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <p className="text-sm text-gray-900 leading-relaxed break-words">{transaction.remark}</p>
                        </div>
                      </div>

                      {/* Meta Information Footer */}
                      <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50/50 rounded-lg p-2 border border-gray-100">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            <Calendar size={12} />
                            <span>{transaction.date}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock size={12} />
                            <span>{new Date(transaction.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User size={12} />
                          <span className="font-medium">{transaction.user}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredTransactions.length === 0 && (
                <div className="text-center py-8 sm:py-12">
                  <FileText size={40} className="sm:w-12 sm:h-12 mx-auto text-gray-300 mb-3 sm:mb-4" />
                  <p className="text-gray-500 text-sm sm:text-base">
                    {selectedDate === new Date().toISOString().split('T')[0] 
                      ? "No transactions today" 
                      : `No transactions on ${selectedDate}`}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-400">
                    {selectedDate === new Date().toISOString().split('T')[0]
                      ? "Add your first transaction above"
                      : "Try selecting a different date or add a new transaction"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          {/* Pending Payments Form */}
          <Card className="border-0 shadow-xl bg-gradient-to-r from-white via-orange-50/30 to-amber-50/30 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  Record Pending Payment
                </h2>
                <p className="text-gray-600 mt-2">Track payments awaiting collection</p>
              </div>

              <form onSubmit={handlePendingSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="to" className="text-base font-medium text-gray-700">Pay To</Label>
                    <Input
                      id="to"
                      name="to"
                      placeholder="Enter recipient name"
                      className="mt-2 h-12 bg-white/80 border-2 border-gray-200 focus:border-orange-400"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="pending-amount" className="text-base font-medium text-gray-700">Amount</Label>
                    <Input
                      id="pending-amount"
                      name="amount"
                      type="number"
                      placeholder="Enter amount"
                      className="mt-2 h-12 bg-white/80 border-2 border-gray-200 focus:border-orange-400"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pending-remark" className="text-base font-medium text-gray-700">Remark</Label>
                    <Input
                      id="pending-remark"
                      name="remark"
                      placeholder="Enter remark"
                      className="mt-2 h-12 bg-white/80 border-2 border-gray-200 focus:border-orange-400"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="pending-date" className="text-base font-medium text-gray-700">Date</Label>
                    <Input
                      id="pending-date"
                      name="date"
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="mt-2 h-12 bg-white/80 border-2 border-gray-200 focus:border-orange-400"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isPendingSubmitting}
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  <Clock className="mr-2" size={20} />
                  {isPendingSubmitting ? "Recording..." : "Record Pending Payment"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Pending Payments List */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">Pending Payments</h3>
              
              <div className="space-y-3">
                {pendingPayments.map((payment) => (
                  <div key={payment.id} className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 sm:p-4 border border-orange-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                          <Clock size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 text-sm sm:text-base truncate">Pay to: {payment.to}</div>
                          <div className="text-xs sm:text-sm text-gray-600 truncate">{payment.remark}</div>
                          <div className="text-xs sm:text-sm text-gray-500 flex items-center space-x-1 sm:space-x-2">
                            <span className="truncate">{payment.date}</span>
                            <span>•</span>
                            <span className="truncate">{payment.user}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                        <div className="text-right">
                          <div className="font-bold text-sm sm:text-lg text-orange-600">₹{payment.amount.toLocaleString()}</div>
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                            Pending
                          </Badge>
                        </div>
                        <Button
                          onClick={() => handleDeletePendingPayment(payment.id, payment.to)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 p-1 sm:p-2"
                        >
                          <Trash2 size={14} className="sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {pendingPayments.length === 0 && (
                <div className="text-center py-12">
                  <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No pending payments</p>
                  <p className="text-sm text-gray-400">All payments are up to date</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditTransactionModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onConfirm={handleUpdateTransaction}
        transaction={selectedTransaction}
      />

    </div>
  );
}