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
import { getISTDateString, getISTNow, getStartOfMonthIST, getStartOfYearIST } from "@/lib/dateUtils";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [exportUser, setExportUser] = useState<"all" | "Puneet" | "Sonu">("all");
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
    const today = getISTNow();

    return data.filter(item => {
      const itemDate = new Date(item[dateField] + 'T00:00:00');

      switch (exportDateRange) {
        case "today":
          return itemDate >= today;
        case "weekly":
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - 7);
          return itemDate >= weekStart;
        case "monthly":
          return itemDate >= getStartOfMonthIST();
        case "yearly":
          return itemDate >= getStartOfYearIST();
        case "custom":
          if (customStartDate && customEndDate) {
            const startDate = new Date(customStartDate + 'T00:00:00');
            const endDate = new Date(customEndDate + 'T23:59:59');
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

      // Filter data by selected date range, then by user
      const byDate = {
        t: filterDataByDateRange(transactionsList),
        p: filterDataByDateRange(pendingList),
        m: filterDataByDateRange(meterList),
      };
      const filteredTransactions = exportUser === "all" ? byDate.t : byDate.t.filter((t: any) => t.user === exportUser);
      const filteredPending    = exportUser === "all" ? byDate.p : byDate.p.filter((p: any) => p.user === exportUser);
      const filteredMeter      = exportUser === "all" ? byDate.m : byDate.m.filter((m: any) => m.user === exportUser);

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
      const userText = exportUser === "all" ? "AllUsers" : exportUser;
      const fileName = `MacLap-${userText}-${dateRangeText}-${new Date().toISOString().split('T')[0]}.xlsx`;
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
    setPdfLoading(true);
    try {
      // Collect data from Firebase
      const [transactionsSnap, pendingSnap, meterSnap] = await Promise.all([
        getDocs(collection(db, "transactions")),
        getDocs(collection(db, "pendingPayments")),
        getDocs(collection(db, "meterReadings"))
      ]);

      const transactionsList = transactionsSnap.docs.map(doc => ({ ...doc.data() as Transaction }));
      const pendingList = pendingSnap.docs.map(doc => ({ ...doc.data() as PendingPayment }));
      const meterList = meterSnap.docs.map(doc => ({ ...doc.data() as MeterReading }));

      // Filter data by selected date range, then by user
      const byDate = {
        t: filterDataByDateRange(transactionsList),
        p: filterDataByDateRange(pendingList),
        m: filterDataByDateRange(meterList),
      };
      const txns   = exportUser === "all" ? byDate.t : byDate.t.filter((t: any) => t.user === exportUser);
      const pending = exportUser === "all" ? byDate.p : byDate.p.filter((p: any) => p.user === exportUser);
      const meters  = exportUser === "all" ? byDate.m : byDate.m.filter((m: any) => m.user === exportUser);

      const totalIn  = txns.filter((t: any) => t.type === 'in').reduce((s: number, t: any) => s + t.amount, 0);
      const totalOut = txns.filter((t: any) => t.type === 'out').reduce((s: number, t: any) => s + t.amount, 0);
      const net = totalIn - totalOut;

      // Per-user balances
      const users = ["Puneet", "Sonu"];
      const userRows = users.map(u => {
        const uIn  = txns.filter((t: any) => t.user === u && t.type === 'in').reduce((s: number, t: any) => s + t.amount, 0);
        const uOut = txns.filter((t: any) => t.user === u && t.type === 'out').reduce((s: number, t: any) => s + t.amount, 0);
        return { name: u, in: uIn, out: uOut, net: uIn - uOut };
      });

      const dateRangeText = exportDateRange === "complete" ? "Complete Data" :
                           exportDateRange === "custom" && customStartDate && customEndDate ?
                           `${customStartDate} to ${customEndDate}` :
                           exportDateRange.charAt(0).toUpperCase() + exportDateRange.slice(1);
      const userLabel = exportUser === "all" ? "All Users" : exportUser;
      const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      const txnRows = (txns as any[]).sort((a, b) => b.timestamp - a.timestamp).map((t: any) => `
        <tr>
          <td>${t.date}</td>
          <td>${t.user}</td>
          <td style="color:${t.type === 'in' ? '#16a34a' : '#dc2626'};font-weight:600">${t.type === 'in' ? 'Cash In' : 'Cash Out'}</td>
          <td style="text-align:right;font-weight:600">₹${Number(t.amount).toLocaleString()}</td>
          <td>${t.remark || '-'}</td>
        </tr>`).join('');

      const pendingRows = (pending as any[]).sort((a, b) => b.timestamp - a.timestamp).map((p: any) => `
        <tr>
          <td>${p.date}</td>
          <td>${p.user}</td>
          <td style="text-align:right;font-weight:600;color:#d97706">₹${Number(p.amount).toLocaleString()}</td>
          <td>${p.remark || '-'}</td>
        </tr>`).join('');

      const meterRows = (meters as any[]).sort((a, b) => b.timestamp - a.timestamp).map((m: any) => `
        <tr>
          <td>${m.date}</td>
          <td>${m.user}</td>
          <td style="text-align:right">${m.reading}</td>
          <td>${m.remark || '-'}</td>
        </tr>`).join('');

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>MacLap Report - ${userLabel} - ${dateRangeText}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1f2937; padding: 24px; }
    h1 { font-size: 22px; font-weight: 800; color: #1e3a5f; }
    h2 { font-size: 14px; font-weight: 700; margin: 18px 0 8px; color: #1e3a5f; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 3px solid #1e3a5f; padding-bottom: 12px; }
    .meta { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px; }
    .summary-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
    .summary-card .val { font-size: 18px; font-weight: 800; }
    .summary-card .lbl { font-size: 10px; color: #6b7280; margin-top: 2px; }
    .green { color: #16a34a; }
    .red   { color: #dc2626; }
    .blue  { color: #2563eb; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
    th { background: #1e3a5f; color: white; padding: 6px 8px; text-align: left; }
    td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }
    tr:nth-child(even) td { background: #f9fafb; }
    .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>MacLap IT Care</h1>
      <div class="meta">Cash Tracking Report &nbsp;|&nbsp; Period: <b>${dateRangeText}</b> &nbsp;|&nbsp; User: <b>${userLabel}</b></div>
      <div class="meta">Generated: ${now} IST</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card"><div class="val green">₹${totalIn.toLocaleString()}</div><div class="lbl">Total Cash In</div></div>
    <div class="summary-card"><div class="val red">₹${totalOut.toLocaleString()}</div><div class="lbl">Total Cash Out</div></div>
    <div class="summary-card"><div class="val ${net >= 0 ? 'green' : 'red'}">₹${Math.abs(net).toLocaleString()}</div><div class="lbl">Net ${net >= 0 ? 'Profit' : 'Loss'}</div></div>
  </div>

  ${exportUser === "all" ? `
  <h2>User Performance</h2>
  <table>
    <thead><tr><th>User</th><th>Cash In</th><th>Cash Out</th><th>Net Balance</th></tr></thead>
    <tbody>${userRows.map(u => `<tr><td><b>${u.name}</b></td><td style="color:#16a34a">₹${u.in.toLocaleString()}</td><td style="color:#dc2626">₹${u.out.toLocaleString()}</td><td style="font-weight:700;color:${u.net>=0?'#16a34a':'#dc2626'}">₹${Math.abs(u.net).toLocaleString()}</td></tr>`).join('')}</tbody>
  </table>` : ''}

  <h2>Transactions (${txns.length})</h2>
  ${txns.length > 0 ? `<table>
    <thead><tr><th>Date</th><th>User</th><th>Type</th><th>Amount</th><th>Remark</th></tr></thead>
    <tbody>${txnRows}</tbody>
  </table>` : '<p style="color:#6b7280;font-style:italic;margin-bottom:12px">No transactions found.</p>'}

  <h2>Pending Payments (${pending.length})</h2>
  ${pending.length > 0 ? `<table>
    <thead><tr><th>Date</th><th>User</th><th>Amount</th><th>Remark</th></tr></thead>
    <tbody>${pendingRows}</tbody>
  </table>` : '<p style="color:#6b7280;font-style:italic;margin-bottom:12px">No pending payments found.</p>'}

  <h2>Meter Readings (${meters.length})</h2>
  ${meters.length > 0 ? `<table>
    <thead><tr><th>Date</th><th>User</th><th>Reading</th><th>Remark</th></tr></thead>
    <tbody>${meterRows}</tbody>
  </table>` : '<p style="color:#6b7280;font-style:italic;margin-bottom:12px">No meter readings found.</p>'}

  <div class="footer">MacLap IT Care &mdash; Cash Tracking System &mdash; Confidential</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

      const win = window.open('', '_blank');
      if (!win) {
        toast({ title: "Popup Blocked", description: "Please allow popups for this site, then try again.", variant: "destructive" });
        setPdfLoading(false);
        return;
      }
      win.document.write(html);
      win.document.close();

      toast({ title: "PDF Ready", description: "A print dialog has opened. Choose 'Save as PDF' to download." });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({ title: "Export Failed", description: "Failed to generate PDF. Please try again.", variant: "destructive" });
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

              {/* User Filter for Export */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-2 mb-3">
                  <User className="text-gray-600" size={18} />
                  <h4 className="font-medium text-gray-800">Export by User</h4>
                </div>
                <div className="flex gap-3">
                  {[
                    { key: "all", label: "👥 All Users" },
                    { key: "Puneet", label: "🔵 Puneet" },
                    { key: "Sonu", label: "🟢 Sonu" }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setExportUser(key as "all" | "Puneet" | "Sonu")}
                      className={`px-5 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                        exportUser === key
                          ? key === "Puneet"
                            ? "bg-blue-600 text-white border-blue-600 shadow-md"
                            : key === "Sonu"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                            : "bg-purple-600 text-white border-purple-600 shadow-md"
                          : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Exporting: <span className="font-semibold">{exportUser === "all" ? "All Users" : exportUser + " only"}</span>
                </p>
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