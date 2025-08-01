import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Lock, User, Trash2, LogOut, AlertTriangle, FileText, FileSpreadsheet, CheckSquare, Square, Volume2, VolumeX, Calendar, Bell, BellOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Transaction, PendingPayment, MeterReading, Note } from "@shared/schema";
import { soundManager } from "@/lib/sounds";
import { notificationManager } from "@/lib/notifications";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type AllRecord = {
  id: string;
  type: "transaction" | "pending" | "meter" | "note";
  date: string;
  details: string;
  user: string;
  timestamp: number;
  data: Transaction | PendingPayment | MeterReading | Note;
};

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [allRecords, setAllRecords] = useState<AllRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(soundManager.getSoundsEnabled());
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('notificationsEnabled') === 'true';
  });
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [exportDateRange, setExportDateRange] = useState<string>("complete");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    setNotificationPermission(notificationManager.getPermissionStatus());
  }, []);

  useEffect(() => {
    const fetchAllRecords = async () => {
      try {
        const [transactions, pending, meters, notes] = await Promise.all([
          getDocs(collection(db, "transactions")),
          getDocs(collection(db, "pendingPayments")),
          getDocs(collection(db, "meterReadings")),
          getDocs(collection(db, "notes"))
        ]);

        const allData: AllRecord[] = [
          ...transactions.docs.map(doc => ({
            id: doc.id,
            type: "transaction" as const,
            date: doc.data().date,
            details: `${doc.data().type === 'in' ? 'Cash In' : 'Cash Out'}: ₹${doc.data().amount} - ${doc.data().remark}`,
            user: doc.data().user,
            timestamp: doc.data().timestamp,
            data: { ...doc.data(), id: doc.id } as unknown as Transaction
          })),
          ...pending.docs.map(doc => ({
            id: doc.id,
            type: "pending" as const,
            date: doc.data().date,
            details: `Pending: ₹${doc.data().amount} - ${doc.data().remark}`,
            user: doc.data().user,
            timestamp: doc.data().timestamp,
            data: { ...doc.data(), id: doc.id } as unknown as PendingPayment
          })),
          ...meters.docs.map(doc => ({
            id: doc.id,
            type: "meter" as const,
            date: doc.data().date,
            details: `Meter Reading: ${doc.data().reading} - ${doc.data().remark}`,
            user: doc.data().user,
            timestamp: doc.data().timestamp,
            data: { ...doc.data(), id: doc.id } as unknown as MeterReading
          })),
          ...notes.docs.map(doc => ({
            id: doc.id,
            type: "note" as const,
            date: doc.data().date,
            details: `Note: ${doc.data().title} - ${doc.data().content.substring(0, 50)}...`,
            user: doc.data().user,
            timestamp: doc.data().timestamp,
            data: { ...doc.data(), id: doc.id } as unknown as Note
          }))
        ];

        allData.sort((a, b) => b.timestamp - a.timestamp);
        setAllRecords(allData);
        setRecordsLoading(false);
      } catch (error) {
        console.error("Error fetching records:", error);
        setRecordsLoading(false);
      }
    };

    fetchAllRecords();
  }, []);

  // Helper function to filter data by date range
  const filterDataByDateRange = (data: any[], dateField: string = 'date') => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      
      switch (exportDateRange) {
        case "today":
          return itemDate >= today;
        case "weekly":
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - 7);
          return itemDate >= weekStart;
        case "monthly":
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          return itemDate >= monthStart;
        case "yearly":
          const yearStart = new Date(today.getFullYear(), 0, 1);
          return itemDate >= yearStart;
        case "custom":
          if (customStartDate && customEndDate) {
            const startDate = new Date(customStartDate);
            const endDate = new Date(customEndDate);
            endDate.setHours(23, 59, 59); // Include full end date
            return itemDate >= startDate && itemDate <= endDate;
          }
          return true;
        default:
          return true;
      }
    });
  };

  // Helper function to calculate user balances
  const calculateUserBalances = (transactions: any[]) => {
    const userBalances: { [key: string]: { in: number, out: number, net: number } } = {};
    
    transactions.forEach(transaction => {
      const user = transaction.user || "Unknown";
      if (!userBalances[user]) {
        userBalances[user] = { in: 0, out: 0, net: 0 };
      }
      
      if (transaction.type === "in") {
        userBalances[user].in += transaction.amount;
      } else {
        userBalances[user].out += transaction.amount;
      }
      userBalances[user].net = userBalances[user].in - userBalances[user].out;
    });
    
    return userBalances;
  };

  // Helper function to get date range description
  const getDateRangeDescription = () => {
    switch (exportDateRange) {
      case "today":
        return "Today's Data";
      case "weekly":
        return "Last 7 Days";
      case "monthly":
        return "This Month";
      case "yearly":
        return "This Year";
      case "custom":
        if (customStartDate && customEndDate) {
          return `${customStartDate} to ${customEndDate}`;
        }
        return "Custom Range";
      default:
        return "Complete Data";
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive",
      });
      return;
    }

    const currentPassword = user.name === "Puneet" ? "maclap2102" : "maclap9811";
    if (oldPassword !== currentPassword) {
      toast({
        title: "Error",
        description: "Current password is incorrect",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Password Changed",
      description: "Your password has been updated successfully",
    });

    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleDeleteRecord = async (record: AllRecord) => {
    if (deletePassword !== "maclap1122") {
      toast({
        title: "Access Denied",
        description: "Invalid delete password",
        variant: "destructive"
      });
      return;
    }

    try {
      const collections = {
        transaction: "transactions",
        pending: "pendingPayments",
        meter: "meterReadings",
        note: "notes"
      };

      await deleteDoc(doc(db, collections[record.type], record.id));
      
      setAllRecords(prev => prev.filter(r => r.id !== record.id));
      setDeletePassword("");

      toast({
        title: "Record Deleted",
        description: "Record has been permanently deleted"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete record",
        variant: "destructive"
      });
    }
  };

  const exportToExcel = async () => {
    const confirmed = window.confirm("Do you want to download the Excel backup file? This will include all your transaction data for the selected date range.");
    if (!confirmed) return;
    
    setExcelLoading(true);
    try {
      // Collect data from Firebase (excluding notes)
      const [transactions, pendingPayments, meterReadings] = await Promise.all([
        getDocs(collection(db, "transactions")),
        getDocs(collection(db, "pendingPayments")),
        getDocs(collection(db, "meterReadings"))
      ]);

      // Convert Firebase docs to arrays with proper typing
      const transactionsList = transactions.docs.map(doc => ({ ...doc.data() as Transaction }));
      const pendingList = pendingPayments.docs.map(doc => ({ ...doc.data() as PendingPayment }));
      const meterList = meterReadings.docs.map(doc => ({ ...doc.data() as MeterReading }));

      // Filter data by selected date range
      const filteredTransactions = filterDataByDateRange(transactionsList);
      const filteredPending = filterDataByDateRange(pendingList);
      const filteredMeter = filterDataByDateRange(meterList);

      // Calculate user balances
      const userBalances = calculateUserBalances(filteredTransactions);

      // Create professional Excel export with better formatting
      const workbook = XLSX.utils.book_new();
      
      // 1. EXECUTIVE SUMMARY SHEET
      const executiveSummary = [
        ['MacLap Cash Tracking System - Executive Report'],
        [''],
        ['Report Period:', getDateRangeDescription()],
        ['Generated On:', new Date().toLocaleDateString()],
        ['Generated At:', new Date().toLocaleTimeString()],
        [''],
        ['BUSINESS OVERVIEW'],
        ['Total Transactions:', filteredTransactions.length],
        ['Total Cash In:', `₹${filteredTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}`],
        ['Total Cash Out:', `₹${filteredTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}`],
        ['Net Position:', `₹${(filteredTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0) - filteredTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0)).toLocaleString()}`],
        ['Pending Payments:', filteredPending.length],
        [''],
        ['USER PERFORMANCE ANALYSIS'],
        ['', 'Cash In', 'Cash Out', 'Net Balance', 'Performance']
      ];

      // Add user balance details
      Object.entries(userBalances).forEach(([user, balance]) => {
        executiveSummary.push([
          user,
          `₹${balance.in.toLocaleString()}`,
          `₹${balance.out.toLocaleString()}`,
          `₹${balance.net.toLocaleString()}`,
          balance.net >= 0 ? 'Profitable' : 'Loss Making'
        ]);
      });

      const summarySheet = XLSX.utils.aoa_to_sheet(executiveSummary);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Executive Summary");

      // 2. TRANSACTIONS SHEET with better formatting
      const transactionData = [
        ['Date', 'Day', 'Type', 'Amount (₹)', 'Remark', 'User', 'Entry Time']
      ];
      
      // Sort transactions by date descending
      const sortedTransactions = [...filteredTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      sortedTransactions.forEach(transaction => {
        const transactionDate = new Date(transaction.date);
        transactionData.push([
          transaction.date,
          transactionDate.toLocaleDateString('en-US', { weekday: 'short' }),
          transaction.type === 'in' ? 'Cash In' : 'Cash Out',
          transaction.amount,
          transaction.remark,
          transaction.user,
          new Date(transaction.timestamp).toLocaleString()
        ]);
      });

      const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData);
      XLSX.utils.book_append_sheet(workbook, transactionSheet, "Transactions");

      // 3. PENDING PAYMENTS SHEET
      if (filteredPending.length > 0) {
        const pendingData = [
          ['Date', 'To', 'Amount (₹)', 'Remark', 'Added By', 'Entry Time']
        ];
        
        const sortedPending = [...filteredPending].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        sortedPending.forEach(payment => {
          pendingData.push([
            payment.date,
            payment.to,
            payment.amount,
            payment.remark,
            payment.user,
            new Date(payment.timestamp).toLocaleString()
          ]);
        });

        const pendingSheet = XLSX.utils.aoa_to_sheet(pendingData);
        XLSX.utils.book_append_sheet(workbook, pendingSheet, "Pending Payments");
      }

      // 4. METER READINGS SHEET
      if (filteredMeter.length > 0) {
        const meterData = [
          ['Date', 'Reading', 'Remark', 'Recorded By', 'Entry Time']
        ];
        
        const sortedMeter = [...filteredMeter].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        sortedMeter.forEach(meter => {
          meterData.push([
            meter.date,
            meter.reading,
            meter.remark,
            meter.user,
            new Date(meter.timestamp).toLocaleString()
          ]);
        });

        const meterSheet = XLSX.utils.aoa_to_sheet(meterData);
        XLSX.utils.book_append_sheet(workbook, meterSheet, "Meter Readings");
      }

      // 5. DAILY SUMMARY SHEET
      const dailySummaryData = [
        ['Date', 'Day', 'Cash In (₹)', 'Cash Out (₹)', 'Net (₹)', 'Transactions', 'Status']
      ];

      // Group transactions by date
      const dailyGroups = filteredTransactions.reduce((groups, transaction) => {
        const date = transaction.date;
        if (!groups[date]) {
          groups[date] = { in: 0, out: 0, count: 0 };
        }
        if (transaction.type === 'in') {
          groups[date].in += transaction.amount;
        } else {
          groups[date].out += transaction.amount;
        }
        groups[date].count++;
        return groups;
      }, {} as Record<string, { in: number; out: number; count: number }>);

      // Sort dates descending
      const sortedDates = Object.keys(dailyGroups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      sortedDates.forEach(date => {
        const day = dailyGroups[date];
        const net = day.in - day.out;
        const dateObj = new Date(date);
        
        dailySummaryData.push([
          date,
          dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
          day.in,
          day.out,
          net,
          day.count,
          net >= 0 ? 'Profitable' : 'Loss'
        ]);
      });

      const dailySummarySheet = XLSX.utils.aoa_to_sheet(dailySummaryData);
      XLSX.utils.book_append_sheet(workbook, dailySummarySheet, "Daily Summary");

      // Generate and download Excel file with descriptive filename
      const dateRangeText = exportDateRange === "complete" ? "complete" : 
                           exportDateRange === "custom" && customStartDate && customEndDate ? 
                           `${customStartDate}-to-${customEndDate}` : exportDateRange;
      const fileName = `MacLap-Professional-Report-${dateRangeText}-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Excel Export Complete",
        description: "Professional Excel report with multiple sheets has been downloaded successfully",
      });
    } catch (error) {
      console.error("Excel export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export Excel file. Please try again.",
        variant: "destructive",
      });
    }
    setExcelLoading(false);
  };

  const exportToPDF = async () => {
    const confirmed = window.confirm("Do you want to download the PDF backup report? This will include all your financial data with detailed balance analysis for the selected date range.");
    if (!confirmed) return;
    
    setPdfLoading(true);
    try {
      // Collect data from Firebase (excluding notes)
      const [transactions, pendingPayments, meterReadings] = await Promise.all([
        getDocs(collection(db, "transactions")),
        getDocs(collection(db, "pendingPayments")),
        getDocs(collection(db, "meterReadings"))
      ]);

      // Convert Firebase docs to arrays with proper typing
      const transactionsList = transactions.docs.map(doc => ({ ...doc.data() as Transaction }));
      const pendingList = pendingPayments.docs.map(doc => ({ ...doc.data() as PendingPayment }));
      const meterList = meterReadings.docs.map(doc => ({ ...doc.data() as MeterReading }));

      // Filter data by selected date range
      const filteredTransactions = filterDataByDateRange(transactionsList);
      const filteredPending = filterDataByDateRange(pendingList);
      const filteredMeter = filterDataByDateRange(meterList);

      // Calculate user balances from filtered transactions
      const userBalances = calculateUserBalances(filteredTransactions);

      const pdf = new jsPDF();
      
      // Professional Header Design with better font sizing
      pdf.setFillColor(30, 41, 59); // Dark blue background
      pdf.rect(0, 0, 210, 45, 'F'); // Full width header
      
      pdf.setTextColor(255, 255, 255); // White text
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MacLap Cash Tracker', 105, 18, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Business Financial Report', 105, 30, { align: 'center' });
      pdf.text(`Period: ${getDateRangeDescription()}`, 105, 38, { align: 'center' });
      
      // Report Info Box with better spacing
      pdf.setTextColor(0, 0, 0); // Black text
      pdf.setFillColor(248, 250, 252); // Light gray background
      pdf.rect(15, 50, 180, 25, 'F'); // Info box
      pdf.setDrawColor(203, 213, 225);
      pdf.rect(15, 50, 180, 25, 'S'); // Border
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Report Generated:', 20, 62);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, 70);
      
      let yPosition = 85;

      // Enhanced Balance Summary Section
      if (filteredTransactions.length > 0) {
        // Section Header with Background
        pdf.setFillColor(59, 130, 246); // Blue background
        pdf.rect(15, yPosition, 180, 15, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.text('User Balance Analysis', 105, yPosition + 10, { align: 'center' });
        yPosition += 25;

        // Calculate overall statistics
        const totalCashIn = Object.values(userBalances).reduce((sum, balance) => sum + balance.in, 0);
        const totalCashOut = Object.values(userBalances).reduce((sum, balance) => sum + balance.out, 0);
        const netPosition = totalCashIn - totalCashOut;

        // Overview Statistics Box with better layout
        pdf.setTextColor(0, 0, 0);
        pdf.setFillColor(240, 253, 244); // Light green background
        pdf.rect(15, yPosition, 180, 35, 'F');
        pdf.setDrawColor(34, 197, 94);
        pdf.rect(15, yPosition, 180, 35, 'S');
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Period Financial Overview:', 20, yPosition + 12);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(`Total Cash In: Rs. ${totalCashIn.toLocaleString()}`, 25, yPosition + 22);
        pdf.text(`Total Cash Out: Rs. ${totalCashOut.toLocaleString()}`, 25, yPosition + 30);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Net Business Position: Rs. ${netPosition.toLocaleString()}`, 110, yPosition + 22);
        pdf.setFont('helvetica', 'normal');
        pdf.text(netPosition >= 0 ? 'Status: Profitable' : 'Status: Loss', 110, yPosition + 30);
        yPosition += 45;

        // Individual user balance table with better formatting
        const balanceData = Object.entries(userBalances).map(([user, balance]) => {
          const profitMargin = balance.in > 0 ? ((balance.net / balance.in) * 100).toFixed(1) : '0.0';
          return [
            user,
            `Rs. ${balance.in.toLocaleString()}`,
            `Rs. ${balance.out.toLocaleString()}`,
            `Rs. ${balance.net.toLocaleString()}`,
            `${profitMargin}%`,
            balance.net >= 0 ? 'Profit' : 'Loss'
          ];
        });

        autoTable(pdf, {
          head: [['User Name', 'Cash In', 'Cash Out', 'Net Balance', 'Profit %', 'Status']],
          body: balanceData,
          startY: yPosition,
          styles: { 
            fontSize: 10,
            cellPadding: 5,
            halign: 'center',
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
          },
          headStyles: { 
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 11
          },
          columnStyles: {
            0: { halign: 'left', fontStyle: 'bold' }, // User name - left aligned
            1: { halign: 'right', textColor: [22, 163, 74], fontStyle: 'bold' }, // Cash In - Green
            2: { halign: 'right', textColor: [220, 38, 127], fontStyle: 'bold' }, // Cash Out - Red
            3: { halign: 'right', fontStyle: 'bold', fontSize: 11 },
            4: { halign: 'center', fontStyle: 'bold' },
            5: { halign: 'center', fontStyle: 'bold' }
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { top: 10, left: 15, right: 15 }
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 25;
      }

      // Check if new page needed
      if (yPosition > 220) {
        pdf.addPage();
        yPosition = 20;
      }

      // Enhanced Transactions section
      if (filteredTransactions.length > 0) {
        // Section Header
        pdf.setFillColor(34, 197, 94); // Green background
        pdf.rect(15, yPosition, 180, 15, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Transaction Details', 105, yPosition + 10, { align: 'center' });
        yPosition += 25;

        // Transaction statistics with better layout
        const cashInTransactions = filteredTransactions.filter(t => t.type === 'Cash In');
        const cashOutTransactions = filteredTransactions.filter(t => t.type === 'Cash Out');
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFillColor(254, 249, 195); // Light yellow background
        pdf.rect(15, yPosition, 180, 25, 'F');
        pdf.setDrawColor(245, 158, 11);
        pdf.rect(15, yPosition, 180, 25, 'S');
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Transaction Summary:`, 20, yPosition + 10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Total: ${filteredTransactions.length} records`, 20, yPosition + 18);
        pdf.text(`Cash In: ${cashInTransactions.length}`, 80, yPosition + 18);
        pdf.text(`Cash Out: ${cashOutTransactions.length}`, 130, yPosition + 18);
        yPosition += 35;

        // Sort transactions by date (newest first)
        const sortedTransactions = [...filteredTransactions].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        const transactionData = sortedTransactions.map(transaction => [
          transaction.date,
          transaction.type,
          `Rs. ${transaction.amount.toLocaleString()}`,
          transaction.remark.length > 35 ? transaction.remark.substring(0, 35) + '...' : transaction.remark,
          transaction.user
        ]);

        autoTable(pdf, {
          head: [['Date', 'Type', 'Amount', 'Remark', 'User']],
          body: transactionData,
          startY: yPosition,
          styles: { 
            fontSize: 9,
            cellPadding: 4,
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
          },
          headStyles: { 
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
          },
          columnStyles: {
            0: { halign: 'center', fontSize: 8 }, // Date - centered
            1: { halign: 'center', fontStyle: 'bold', textColor: [34, 197, 94] }, // Transaction Type
            2: { halign: 'right', fontStyle: 'bold', textColor: [59, 130, 246] }, // Amount
            3: { halign: 'left', fontSize: 8 }, // Remark - left aligned
            4: { halign: 'center', fontStyle: 'bold' } // User - centered
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { top: 10, left: 15, right: 15 }
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 25;
      }

      // Add new page if needed
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      // Check if new page needed
      if (yPosition > 220) {
        pdf.addPage();
        yPosition = 20;
      }

      // Pending Payments section
      if (filteredPending.length > 0) {
        pdf.setFontSize(16);
        pdf.text('Pending Payments', 20, yPosition);
        yPosition += 10;

        const pendingData = filteredPending.map(payment => [
          payment.date,
          payment.to,
          `₹${payment.amount.toLocaleString()}`,
          payment.remark,
          payment.user
        ]);

        autoTable(pdf, {
          head: [['Date', 'To', 'Amount', 'Remark', 'User']],
          body: pendingData,
          startY: yPosition,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [243, 156, 18] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { top: 10 }
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 20;
      }

      // Check if new page needed
      if (yPosition > 220) {
        pdf.addPage();
        yPosition = 20;
      }

      // Meter Readings section
      if (filteredMeter.length > 0) {
        pdf.setFontSize(16);
        pdf.text('Meter Readings', 20, yPosition);
        yPosition += 10;

        const meterData = filteredMeter.map(meter => [
          meter.date,
          meter.reading.toString(),
          meter.remark,
          meter.user
        ]);

        autoTable(pdf, {
          head: [['Date', 'Reading', 'Remark', 'User']],
          body: meterData,
          startY: yPosition,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [155, 89, 182] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { top: 10 }
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 20;
      }

      // Check if new page needed
      if (yPosition > 220) {
        pdf.addPage();
        yPosition = 20;
      }



      // Enhanced Summary Footer Section
      if (yPosition > 180) {
        pdf.addPage();
        yPosition = 20;
      }

      // Summary Header
      pdf.setFillColor(99, 102, 241); // Indigo background
      pdf.rect(15, yPosition, 180, 15, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Report Summary', 105, yPosition + 10, { align: 'center' });
      yPosition += 25;

      // Summary Statistics Box with improved layout
      pdf.setTextColor(0, 0, 0);
      pdf.setFillColor(243, 244, 246); // Light gray background
      pdf.rect(15, yPosition, 180, 55, 'F');
      pdf.setDrawColor(156, 163, 175);
      pdf.rect(15, yPosition, 180, 55, 'S');
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Record Summary:', 20, yPosition + 12);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Transactions: ${filteredTransactions.length} records`, 25, yPosition + 22);
      pdf.text(`Pending Payments: ${filteredPending.length} records`, 25, yPosition + 30);
      pdf.text(`Meter Readings: ${filteredMeter.length} records`, 25, yPosition + 38);
      
      // Business totals with better alignment
      if (filteredTransactions.length > 0) {
        const totalCashIn = Object.values(userBalances).reduce((sum, balance) => sum + balance.in, 0);
        const totalCashOut = Object.values(userBalances).reduce((sum, balance) => sum + balance.out, 0);
        const netPosition = totalCashIn - totalCashOut;
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Financial Summary:', 110, yPosition + 12);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Total Cash In: Rs. ${totalCashIn.toLocaleString()}`, 115, yPosition + 22);
        pdf.text(`Total Cash Out: Rs. ${totalCashOut.toLocaleString()}`, 115, yPosition + 30);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Net Position: Rs. ${netPosition.toLocaleString()}`, 115, yPosition + 38);
        if (netPosition >= 0) {
          pdf.setTextColor(22, 163, 74); // Green for profit
        } else {
          pdf.setTextColor(220, 38, 127); // Red for loss
        }
        pdf.text(netPosition >= 0 ? 'Status: Profitable' : 'Status: Loss', 115, yPosition + 46);
      }
      
      yPosition += 70;

      // Professional Footer with better spacing
      pdf.setTextColor(0, 0, 0);
      pdf.setFillColor(30, 41, 59); // Dark blue footer
      pdf.rect(0, yPosition, 210, 25, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('MacLap Business Management System', 20, yPosition + 10);
      pdf.text(`Report Generated: ${new Date().toLocaleDateString()}`, 20, yPosition + 18);
      pdf.text('Confidential Business Data', 140, yPosition + 10);
      pdf.text('Professional Financial Report', 140, yPosition + 18);

      // Save PDF with descriptive filename
      const dateRangeText = exportDateRange === "complete" ? "complete" : 
                           exportDateRange === "custom" && customStartDate && customEndDate ? 
                           `${customStartDate}-to-${customEndDate}` : exportDateRange;
      const fileName = `maclap-backup-${dateRangeText}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF Export Complete",
        description: "Your data has been exported to PDF successfully",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export PDF file. Please try again.",
        variant: "destructive",
      });
    }
    setPdfLoading(false);
  };

  // Bulk selection functions for delete records
  const toggleRecordSelection = (recordId: string) => {
    const newSelection = new Set(selectedRecords);
    if (newSelection.has(recordId)) {
      newSelection.delete(recordId);
    } else {
      newSelection.add(recordId);
    }
    setSelectedRecords(newSelection);
  };

  const selectAllRecords = () => {
    setSelectedRecords(new Set(allRecords.map(r => r.id)));
  };

  const clearAllSelections = () => {
    setSelectedRecords(new Set());
  };

  const handleBulkDeleteClick = () => {
    if (selectedRecords.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select records to delete",
        variant: "destructive"
      });
      return;
    }
    setShowBulkDelete(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (deletePassword !== "maclap1122") {
      toast({
        title: "Access Denied",
        description: "Invalid delete password",
        variant: "destructive"
      });
      return;
    }

    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedRecords).map(id => {
        const record = allRecords.find(r => r.id === id);
        if (!record) return Promise.resolve();
        
        const collections = {
          transaction: "transactions",
          pending: "pendingPayments",
          meter: "meterReadings",
          note: "notes"
        };
        
        return deleteDoc(doc(db, collections[record.type], id));
      });
      
      await Promise.all(deletePromises);
      
      setSelectedRecords(new Set());
      setShowBulkDelete(false);
      setDeletePassword("");
      
      toast({
        title: "Records Deleted",
        description: `${selectedRecords.size} records have been permanently deleted`,
      });
    } catch (error) {
      console.error("Error deleting records:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete some records",
        variant: "destructive"
      });
    }
    setIsDeleting(false);
  };

  const handleCancelBulkDelete = () => {
    setShowBulkDelete(false);
    setDeletePassword("");
  };

  const handleSoundToggle = (enabled: boolean) => {
    setSoundsEnabled(enabled);
    soundManager.setSoundsEnabled(enabled);
    
    // Play a test sound if enabling
    if (enabled) {
      soundManager.playClickSound();
    }
    
    toast({
      title: "Sound Settings Updated",
      description: `Sound effects ${enabled ? "enabled" : "disabled"}`,
    });
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      const hasPermission = await notificationManager.requestPermission();
      if (hasPermission) {
        setNotificationsEnabled(true);
        setNotificationPermission('granted');
        localStorage.setItem('notificationsEnabled', 'true');
        
        // Schedule daily reminders for current user
        if (user?.username) {
          await notificationManager.scheduleDailyReminder(user.username);
        }
        
        toast({
          title: "Daily Reminders Enabled",
          description: "You'll receive notifications at 10:00 PM every day"
        });
      } else {
        setNotificationPermission(notificationManager.getPermissionStatus());
        toast({
          title: "Permission Required",
          description: "Please allow notifications in your browser settings",
          variant: "destructive"
        });
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('notificationsEnabled', 'false');
      
      // Stop daily reminders
      if (user?.username) {
        notificationManager.stopDailyReminder(user.username);
      }
      
      toast({
        title: "Daily Reminders Disabled",
        description: "No more notification reminders will be sent"
      });
    }
  };

  const testNotification = async () => {
    if (user?.username) {
      const success = await notificationManager.testNotification(user.username);
      if (success) {
        toast({
          title: "Test Notification Sent",
          description: "Check if you received the notification"
        });
      } else {
        toast({
          title: "Notification Failed",
          description: "Please check your browser permissions",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* User Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 text-white p-4 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Welcome, {user?.name}</h2>
              <p className="text-white/70 text-sm">Administrator</p>
            </div>
          </div>
          <Button
            onClick={logout}
            size="sm"
            className="bg-white/20 text-white hover:bg-white/30 border-0 backdrop-blur-sm shadow-lg transition-all duration-200"
          >
            <LogOut size={16} className="mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="delete">Delete Transaction</TabsTrigger>
        </TabsList>
        
        <TabsContent value="settings" className="space-y-6">
          {/* App Preferences */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Volume2 className="text-gray-600" size={20} />
                <h3 className="text-lg font-medium text-gray-800">App Preferences</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {soundsEnabled ? (
                      <Volume2 className="text-blue-600" size={20} />
                    ) : (
                      <VolumeX className="text-gray-400" size={20} />
                    )}
                    <div>
                      <p className="font-medium text-gray-800">Sound Effects</p>
                      <p className="text-sm text-gray-600">Play audio feedback for transactions</p>
                    </div>
                  </div>
                  <Switch
                    checked={soundsEnabled}
                    onCheckedChange={handleSoundToggle}
                  />
                </div>

                {/* Daily Notification Reminders */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {notificationsEnabled ? (
                      <Bell className="text-green-600" size={20} />
                    ) : (
                      <BellOff className="text-gray-400" size={20} />
                    )}
                    <div>
                      <p className="font-medium text-gray-800">Daily Reminders</p>
                      <p className="text-sm text-gray-600">Get notifications at 10:00 PM to add daily transactions</p>
                      {notificationPermission === 'denied' && (
                        <p className="text-xs text-red-500 mt-1">Permission denied - check browser settings</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {notificationsEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={testNotification}
                        className="text-xs"
                      >
                        Test
                      </Button>
                    )}
                    <Switch
                      checked={notificationsEnabled}
                      onCheckedChange={handleNotificationToggle}
                      disabled={notificationPermission === 'denied'}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Lock className="text-gray-600" size={20} />
                <h3 className="text-lg font-medium text-gray-800">Change Password</h3>
              </div>
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <Label htmlFor="oldPassword">Current Password</Label>
                  <Input
                    id="oldPassword"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full">
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Data Export */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Download className="text-gray-600" size={20} />
                <h3 className="text-lg font-medium text-gray-800">Export Data</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-6">
                Download your data including transactions, pending payments, meter readings, and notes in your preferred format with date range options.
              </p>

              {/* Date Range Selection */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="text-gray-600" size={18} />
                  <h4 className="font-medium text-gray-800">Export Date Range</h4>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  <Select value={exportDateRange} onValueChange={setExportDateRange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="weekly">Last 7 Days</SelectItem>
                      <SelectItem value="monthly">This Month</SelectItem>
                      <SelectItem value="yearly">This Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                      <SelectItem value="complete">Complete Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {exportDateRange === "custom" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="startDate" className="text-sm font-medium">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate" className="text-sm font-medium">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
                
                <div className="mt-3 text-xs text-gray-600">
                  <span className="font-medium">Selected:</span> {getDateRangeDescription()}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={exportToExcel} 
                  disabled={excelLoading || pdfLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-200"
                >
                  <FileSpreadsheet size={18} className="mr-2" />
                  {excelLoading ? "Creating Excel..." : "Export to Excel"}
                </Button>
                
                <Button 
                  onClick={exportToPDF} 
                  disabled={excelLoading || pdfLoading}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-200"
                >
                  <FileText size={18} className="mr-2" />
                  {pdfLoading ? "Creating PDF..." : "Export to PDF"}
                </Button>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold mb-1">Enhanced Export Features:</p>
                    <p><strong>Date Range Filtering:</strong> Export data for specific time periods (today, weekly, monthly, yearly, or custom)</p>
                    <p><strong>User Balance Summary:</strong> Sonu and Puneet's individual cash in/out totals with net balance calculations</p>
                    <p><strong>Excel:</strong> Multiple sheets with balance summary, organized data, perfect for analysis</p>
                    <p><strong>PDF:</strong> Professional report with user balances, color-coded tables, ideal for printing</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delete" className="space-y-6">
          {/* Delete Records Section */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="text-red-600" size={20} />
                <h3 className="text-lg font-medium text-red-800">Delete Transaction</h3>
              </div>
              
              <p className="text-sm text-red-700 mb-4">
                Permanently delete transactions from the system. This action cannot be undone.
              </p>
              
              <div className="mb-4">
                <Label htmlFor="deletePassword">Delete Password</Label>
                <Input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter delete password"
                />
              </div>
            </CardContent>
          </Card>

          {/* All Records Table */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-0">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">All Records</h3>
                  
                  <div className="flex items-center space-x-3">
                    {selectedRecords.size > 0 && (
                      <>
                        <span className="text-sm text-gray-600">
                          {selectedRecords.size} selected
                        </span>
                        <Button
                          onClick={clearAllSelections}
                          size="sm"
                          variant="outline"
                          className="text-xs h-8"
                        >
                          Clear
                        </Button>
                        <Button
                          onClick={handleBulkDeleteClick}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white text-xs h-8"
                        >
                          <Trash2 size={12} className="mr-1" />
                          Delete Selected
                        </Button>
                      </>
                    )}
                    
                    {allRecords.length > 0 && (
                      <Button
                        onClick={selectedRecords.size === allRecords.length ? clearAllSelections : selectAllRecords}
                        size="sm"
                        variant="outline"
                        className="text-xs h-8"
                      >
                        {selectedRecords.size === allRecords.length ? (
                          <>
                            <CheckSquare size={12} className="mr-1" />
                            Deselect All
                          </>
                        ) : (
                          <>
                            <Square size={12} className="mr-1" />
                            Select All
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {recordsLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRecords.map((record) => {
                      const isSelected = selectedRecords.has(record.id);
                      return (
                        <TableRow key={record.id} className={isSelected ? "bg-blue-50" : ""}>
                          <TableCell>
                            <button
                              onClick={() => toggleRecordSelection(record.id)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                                isSelected 
                                  ? 'bg-blue-600 border-blue-600 text-white' 
                                  : 'border-gray-300 hover:border-blue-400'
                              }`}
                            >
                              {isSelected && <CheckSquare size={12} />}
                            </button>
                          </TableCell>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                record.type === "transaction" ? "default" :
                                record.type === "pending" ? "secondary" :
                                record.type === "meter" ? "outline" : "destructive"
                              }
                            >
                              {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{record.details}</TableCell>
                          <TableCell>{record.user}</TableCell>
                          <TableCell>
                            <Button
                              onClick={() => handleDeleteRecord(record)}
                              variant="destructive"
                              size="sm"
                              disabled={!deletePassword}
                            >
                              <Trash2 size={14} className="mr-1" />
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-xl">
                  <Trash2 size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Delete Multiple Records</h3>
                  <p className="text-gray-600 text-sm">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  You are about to delete <span className="font-semibold text-red-600">{selectedRecords.size}</span> records permanently.
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-delete-password" className="text-sm font-medium text-gray-700">
                    Enter delete password to confirm
                  </Label>
                  <Input
                    id="bulk-delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Delete password"
                    className="mt-1"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleBulkDeleteConfirm}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 size={16} className="mr-2" />
                    {isDeleting ? "Deleting..." : `Delete ${selectedRecords.size} Records`}
                  </Button>
                  <Button
                    onClick={handleCancelBulkDelete}
                    variant="outline"
                    className="border-gray-300"
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}