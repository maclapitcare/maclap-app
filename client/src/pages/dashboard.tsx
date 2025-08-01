import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Transaction, PendingPayment } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Wallet, Clock, Calendar, Sparkles, Target, TrendingUp, TrendingDown, User, LogOut, Search, BarChart3, PieChart, Activity, Award, Zap, DollarSign } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell } from "recharts";

type TimeRange = "today" | "yesterday" | "weekly" | "monthly" | "yearly" | "january" | "february" | "march" | "april" | "may" | "june" | "july" | "august" | "september" | "october" | "november" | "december";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<TimeRange>("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Function to get display name for current period selection
  const getPeriodDisplayName = () => {
    switch (selectedRange) {
      case "today": return "Today";
      case "yesterday": return "Yesterday";
      case "weekly": return "This Week";
      case "monthly": return "This Month";
      case "yearly": return "This Year";
      case "january": return `January ${selectedYear}`;
      case "february": return `February ${selectedYear}`;
      case "march": return `March ${selectedYear}`;
      case "april": return `April ${selectedYear}`;
      case "may": return `May ${selectedYear}`;
      case "june": return `June ${selectedYear}`;
      case "july": return `July ${selectedYear}`;
      case "august": return `August ${selectedYear}`;
      case "september": return `September ${selectedYear}`;
      case "october": return `October ${selectedYear}`;
      case "november": return `November ${selectedYear}`;
      case "december": return `December ${selectedYear}`;
      default: return "Today";
    }
  };

  useEffect(() => {
    const unsubscribeTransactions = onSnapshot(
      query(collection(db, "transactions"), orderBy("timestamp", "desc")),
      (snapshot) => {
        const transactionData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as unknown as Transaction[];
        setTransactions(transactionData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching transactions:", error);
        setLoading(false);
      }
    );

    const unsubscribePending = onSnapshot(
      query(collection(db, "pendingPayments"), orderBy("timestamp", "desc")),
      (snapshot) => {
        const pendingData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as unknown as PendingPayment[];
        setPendingPayments(pendingData);
      },
      (error) => {
        console.error("Error fetching pending payments:", error);
      }
    );

    return () => {
      unsubscribeTransactions();
      unsubscribePending();
    };
  }, []);

  const getFilteredTransactions = () => {
    let filtered = [...transactions];

    // GLOBAL SEARCH: If there's a search query, search across ALL transactions first
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = transactions.filter(t => {
        // Search in remark (most comprehensive)
        if (t.remark.toLowerCase().includes(query)) return true;
        
        // Search in amount (exact and partial matches)
        if (t.amount.toString().includes(query)) return true;
        
        // Search in user name
        if (t.user.toLowerCase().includes(query)) return true;
        
        // Search in transaction type with variations
        if (query.includes('cash in') || query.includes('cashin') || query === 'in') {
          return t.type === 'in';
        }
        if (query.includes('cash out') || query.includes('cashout') || query === 'out') {
          return t.type === 'out';
        }
        
        // Search in formatted amount with currency symbols
        const formattedAmount = `₹${t.amount}`;
        if (formattedAmount.toLowerCase().includes(query)) return true;
        
        // Search in date variations
        const transactionDate = new Date(t.date);
        const dateStrings = [
          t.date,
          transactionDate.toLocaleDateString(),
          transactionDate.toLocaleDateString('en-US', { weekday: 'long' }),
          transactionDate.toLocaleDateString('en-US', { month: 'long' }),
          transactionDate.toLocaleDateString('en-US', { day: 'numeric' }),
          transactionDate.toLocaleDateString('en-US', { year: 'numeric' })
        ];
        
        if (dateStrings.some(dateStr => dateStr.toLowerCase().includes(query))) return true;
        
        return false;
      });
      
      // Sort search results by date (newest first) for better organization
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Apply specific date filter if provided along with search
      if (searchDate) {
        filtered = filtered.filter(t => t.date === searchDate);
      }
      
      return filtered;
    }

    // If no search query, apply period filtering as usual
    const now = new Date();

    switch (selectedRange) {
      case "today":
        const today = now.toISOString().split('T')[0];
        filtered = transactions.filter(t => t.date === today);
        break;
      case "yesterday":
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        filtered = transactions.filter(t => t.date === yesterdayStr);
        break;
      case "weekly":
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = transactions.filter(t => new Date(t.date) >= weekAgo);
        break;
      case "monthly":
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = transactions.filter(t => new Date(t.date) >= monthAgo);
        break;
      case "yearly":
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        filtered = transactions.filter(t => new Date(t.date) >= yearAgo);
        break;
      case "january":
      case "february":
      case "march":
      case "april":
      case "may":
      case "june":
      case "july":
      case "august":
      case "september":
      case "october":
      case "november":
      case "december":
        const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
        const monthIndex = monthNames.indexOf(selectedRange);
        filtered = transactions.filter(t => {
          const transactionDate = new Date(t.date);
          return transactionDate.getMonth() === monthIndex && transactionDate.getFullYear() === selectedYear;
        });
        break;
    }



    if (searchDate) {
      filtered = filtered.filter(t => t.date === searchDate);
    }

    return filtered;
  };

  const getFilteredPending = () => {
    const now = new Date();
    let filtered = [...pendingPayments];

    switch (selectedRange) {
      case "today":
        const today = now.toISOString().split('T')[0];
        filtered = pendingPayments.filter(p => p.date === today);
        break;
      case "yesterday":
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        filtered = pendingPayments.filter(p => p.date === yesterdayStr);
        break;
      case "weekly":
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = pendingPayments.filter(p => new Date(p.date) >= weekAgo);
        break;
      case "monthly":
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = pendingPayments.filter(p => new Date(p.date) >= monthAgo);
        break;
      case "yearly":
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        filtered = pendingPayments.filter(p => new Date(p.date) >= yearAgo);
        break;
      case "january":
      case "february":
      case "march":
      case "april":
      case "may":
      case "june":
      case "july":
      case "august":
      case "september":
      case "october":
      case "november":
      case "december":
        const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
        const monthIndex = monthNames.indexOf(selectedRange);
        filtered = pendingPayments.filter(p => {
          const paymentDate = new Date(p.date);
          return paymentDate.getMonth() === monthIndex && paymentDate.getFullYear() === selectedYear;
        });
        break;
    }

    return filtered;
  };



  const filteredTransactions = getFilteredTransactions();
  const filteredPending = getFilteredPending();

  const summary = {
    totalIn: filteredTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0),
    totalOut: filteredTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0),
    get netBalance() { return this.totalIn - this.totalOut; },
    pendingCount: filteredPending.length,
    transactionCount: filteredTransactions.length
  };

  const userBalances = {
    Puneet: {
      in: filteredTransactions.filter(t => t.user === 'Puneet' && t.type === 'in').reduce((sum, t) => sum + t.amount, 0),
      out: filteredTransactions.filter(t => t.user === 'Puneet' && t.type === 'out').reduce((sum, t) => sum + t.amount, 0),
      get balance() { return this.in - this.out; }
    },
    Sonu: {
      in: filteredTransactions.filter(t => t.user === 'Sonu' && t.type === 'in').reduce((sum, t) => sum + t.amount, 0),
      out: filteredTransactions.filter(t => t.user === 'Sonu' && t.type === 'out').reduce((sum, t) => sum + t.amount, 0),
      get balance() { return this.in - this.out; }
    }
  };

  // Generate chart data for the last 7 days
  const getChartData = () => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTransactions = transactions.filter(t => t.date === dateStr);
      const cashIn = dayTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
      const cashOut = dayTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);
      
      last7Days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        cashIn,
        cashOut,
        net: cashIn - cashOut
      });
    }
    
    return last7Days;
  };

  // Get user comparison data
  const getUserComparisonData = () => [
    {
      name: 'Puneet',
      cashIn: userBalances.Puneet.in,
      cashOut: userBalances.Puneet.out,
      net: userBalances.Puneet.balance
    },
    {
      name: 'Sonu',
      cashIn: userBalances.Sonu.in,
      cashOut: userBalances.Sonu.out,
      net: userBalances.Sonu.balance
    }
  ];

  // Smart insights
  const getSmartInsights = () => {
    const insights = [];
    const todayTransactions = transactions.filter(t => t.date === new Date().toISOString().split('T')[0]);
    const avgDailyIn = transactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0) / Math.max(1, new Set(transactions.map(t => t.date)).size);
    
    if (summary.netBalance > 0) {
      insights.push({
        type: 'positive',
        icon: TrendingUp,
        title: 'Profitable Period',
        message: `Net profit of ₹${summary.netBalance.toLocaleString()} this ${selectedRange}`
      });
    }
    
    if (todayTransactions.length > 0) {
      const todayAmount = todayTransactions.reduce((sum, t) => sum + (t.type === 'in' ? t.amount : -t.amount), 0);
      if (todayAmount > avgDailyIn) {
        insights.push({
          type: 'achievement',
          icon: Award,
          title: 'Great Day!',
          message: 'Today\'s performance is above average'
        });
      }
    }
    
    if (summary.pendingCount > 0) {
      insights.push({
        type: 'warning',
        icon: Clock,
        title: 'Pending Payments',
        message: `${summary.pendingCount} payments awaiting collection`
      });
    }
    
    return insights;
  };

  const chartData = getChartData();
  const userComparisonData = getUserComparisonData();
  const smartInsights = getSmartInsights();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 pb-20">
      {/* Smart Header with Welcome & Insights */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 text-white p-6 rounded-2xl shadow-2xl mb-6 mx-4 mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <BarChart3 size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Welcome, {user?.name}</h2>
              <p className="text-white/80 text-sm">Dashboard • {getPeriodDisplayName()}</p>
            </div>
          </div>
          <Button
            onClick={logout}
            size="sm"
            className="bg-white/20 text-white hover:bg-white/30 border-0 backdrop-blur-sm shadow-lg transition-all duration-200 rounded-xl"
          >
            <LogOut size={16} className="mr-2" />
            Logout
          </Button>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <DollarSign size={16} className="text-emerald-300" />
              <span className="text-white/90 text-sm">Net Balance</span>
            </div>
            <p className={`text-xl font-bold ${summary.netBalance >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              ₹{Math.abs(summary.netBalance).toLocaleString()}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <Activity size={16} className="text-blue-300" />
              <span className="text-white/90 text-sm">Transactions</span>
            </div>
            <p className="text-xl font-bold text-blue-300">{summary.transactionCount}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-amber-300" />
              <span className="text-white/90 text-sm">Pending</span>
            </div>
            <p className="text-xl font-bold text-amber-300">{summary.pendingCount}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <Target size={16} className="text-purple-300" />
              <span className="text-white/90 text-sm">Success Rate</span>
            </div>
            <p className="text-xl font-bold text-purple-300">
              {summary.totalIn > 0 ? Math.round((summary.totalIn / (summary.totalIn + summary.totalOut)) * 100) : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-4 mb-6">
        {/* Enhanced Time Range and Advanced Search Controls */}
        <div className="bg-gradient-to-r from-white via-blue-50 to-emerald-50 rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="space-y-6">
            {/* Period Selection with Quick Access Buttons */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Calendar size={20} className="text-blue-600" />
                <span className="text-lg font-semibold text-gray-800">Time Period</span>
              </div>
              
              {/* Quick Period Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                  { key: "today", label: "Today", icon: "📅" },
                  { key: "yesterday", label: "Yesterday", icon: "📋" },
                  { key: "weekly", label: "This Week", icon: "📊" },
                  { key: "monthly", label: "This Month", icon: "📈" },
                  { key: "yearly", label: "This Year", icon: "📜" }
                ].map(({ key, label, icon }) => (
                  <Button
                    key={key}
                    onClick={() => setSelectedRange(key as TimeRange)}
                    variant={selectedRange === key ? "default" : "outline"}
                    className={`h-12 text-xs font-medium transition-all duration-200 ${
                      selectedRange === key 
                        ? "bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg scale-105" 
                        : "bg-white hover:bg-blue-50 border-gray-200 hover:border-blue-300 text-gray-700"
                    }`}
                  >
                    <span className="mr-1">{icon}</span>
                    {label}
                  </Button>
                ))}
              </div>

              {/* Month/Year Selector */}
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-600">Specific Month:</span>
                <Select value={selectedRange} onValueChange={(value: TimeRange) => setSelectedRange(value)}>
                  <SelectTrigger className="w-36 bg-white border-gray-300 rounded-xl h-10 font-medium">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="january">🗓️ January</SelectItem>
                    <SelectItem value="february">🗓️ February</SelectItem>
                    <SelectItem value="march">🗓️ March</SelectItem>
                    <SelectItem value="april">🗓️ April</SelectItem>
                    <SelectItem value="may">🗓️ May</SelectItem>
                    <SelectItem value="june">🗓️ June</SelectItem>
                    <SelectItem value="july">🗓️ July</SelectItem>
                    <SelectItem value="august">🗓️ August</SelectItem>
                    <SelectItem value="september">🗓️ September</SelectItem>
                    <SelectItem value="october">🗓️ October</SelectItem>
                    <SelectItem value="november">🗓️ November</SelectItem>
                    <SelectItem value="december">🗓️ December</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Year Picker */}
                {["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].includes(selectedRange) && (
                  <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                    <SelectTrigger className="w-20 bg-white border-gray-300 rounded-xl h-10 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2023">2023</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              {/* Current Selection Display */}
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700 font-medium">Selected Period:</span>
                  <span className="text-sm font-bold text-blue-800">{getPeriodDisplayName()}</span>
                </div>
              </div>
            </div>

            {/* Advanced Search Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Search size={20} className="text-emerald-600" />
                <span className="text-lg font-semibold text-gray-800">Advanced Search</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Text Search */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Search Text</Label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Amount, remark, user..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-white border-gray-300 rounded-xl h-10 font-medium focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Date Search */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Specific Date</Label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      type="date"
                      value={searchDate}
                      onChange={(e) => setSearchDate(e.target.value)}
                      className="pl-9 bg-white border-gray-300 rounded-xl h-10 font-medium focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Search Actions */}
                <div className="space-y-2 flex flex-col justify-end">
                  <div className="flex space-x-2">
                    {(searchQuery.trim() || searchDate) && (
                      <Button
                        onClick={() => {
                          setSearchQuery("");
                          setSearchDate("");
                        }}
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-white hover:bg-red-50 border-red-200 text-red-600 hover:text-red-700 rounded-xl font-medium"
                      >
                        Clear Search
                      </Button>
                    )}
                    <div className="flex items-center space-x-1 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-xl">
                      <span>📊 {filteredTransactions.length} results</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Hints and Global Search Info */}
              {!searchQuery && !searchDate && (
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                  <div className="text-xs text-emerald-700">
                    <span className="font-medium">🔍 Global Search:</span> 
                    Search scans your entire database and shows results organized by date. Try searching by amount ("1500"), user ("Puneet"), transaction type ("cash in"), or any remark text.
                  </div>
                </div>
              )}
              
              {/* Search Results Info */}
              {(searchQuery.trim() || searchDate) && (
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                  <div className="text-xs text-blue-700">
                    <span className="font-medium">🎯 Search Results:</span> 
                    {searchQuery.trim() && `Found ${filteredTransactions.length} transactions matching "${searchQuery}"`}
                    {searchDate && ` on ${new Date(searchDate).toLocaleDateString()}`}
                    {searchQuery.trim() && " (sorted by date, newest first)"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Smart Insights */}
        {smartInsights.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Sparkles size={20} className="mr-2 text-purple-600" />
              Smart Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {smartInsights.map((insight, index) => {
                const IconComponent = insight.icon;
                const bgColor = insight.type === 'positive' ? 'from-emerald-50 to-emerald-100' :
                              insight.type === 'achievement' ? 'from-blue-50 to-blue-100' :
                              'from-amber-50 to-amber-100';
                const iconColor = insight.type === 'positive' ? 'text-emerald-600' :
                                insight.type === 'achievement' ? 'text-blue-600' :
                                'text-amber-600';
                
                return (
                  <Card key={index} className={`border-0 shadow-md bg-gradient-to-br ${bgColor}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-xl bg-white/80 ${iconColor}`}>
                          <IconComponent size={18} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800 text-sm">{insight.title}</h4>
                          <p className="text-gray-600 text-xs mt-1">{insight.message}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Enhanced User Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {Object.entries(userBalances).map(([username, balance]) => {
            const isPuneet = username === "Puneet";
            const gradientClass = isPuneet ? "from-blue-500 to-blue-600" : "from-emerald-500 to-emerald-600";
            const userAvatar = isPuneet ? "P" : "S";
            
            return (
              <Card key={username} className="border-0 shadow-lg bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className={`w-14 h-14 bg-gradient-to-br ${gradientClass} rounded-2xl flex items-center justify-center text-white font-bold shadow-lg text-xl`}>
                        {userAvatar}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 text-lg">{username}</div>
                        <div className="text-gray-500 text-sm">
                          {selectedRange === "today" ? "Today" :
                           selectedRange === "yesterday" ? "Yesterday" :
                           selectedRange === "weekly" ? "This Week" :
                           selectedRange === "monthly" ? "This Month" :
                           selectedRange === "yearly" ? "This Year" :
                           ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].includes(selectedRange) 
                             ? `${selectedRange.charAt(0).toUpperCase() + selectedRange.slice(1)} ${selectedYear}` 
                             : "Activity"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${balance.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {balance.balance >= 0 ? '+' : ''}₹{Math.abs(balance.balance).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Net Balance</div>
                    </div>
                  </div>
                  
                  {/* Detailed Breakdown */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50 rounded-xl p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <ArrowUp size={16} className="text-emerald-600" />
                        <span className="text-emerald-700 text-sm font-medium">Cash In</span>
                      </div>
                      <p className="text-2xl font-bold text-emerald-600">₹{balance.in.toLocaleString()}</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <ArrowDown size={16} className="text-red-600" />
                        <span className="text-red-700 text-sm font-medium">Cash Out</span>
                      </div>
                      <p className="text-2xl font-bold text-red-600">₹{balance.out.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Interactive Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Cash Flow Trend Chart */}
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                  <Activity size={20} className="mr-2 text-blue-600" />
                  7-Day Cash Flow
                </h3>
                <div className="text-sm text-gray-500">Trend Analysis</div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: any) => [`₹${value.toLocaleString()}`, '']}
                    />
                    <Line type="monotone" dataKey="cashIn" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} />
                    <Line type="monotone" dataKey="cashOut" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center space-x-6 mt-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Cash In</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Cash Out</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Performance Comparison */}
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                  <BarChart3 size={20} className="mr-2 text-purple-600" />
                  User Performance
                </h3>
                <div className="text-sm text-gray-500">{getPeriodDisplayName()}</div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: any) => [`₹${value.toLocaleString()}`, '']}
                    />
                    <Bar dataKey="cashIn" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cashOut" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center space-x-6 mt-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Cash In</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Cash Out</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Search Results Section - Show when search is active */}
        {(searchQuery.trim() || searchDate) && (
          <div className="mt-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Search size={20} className="mr-2 text-emerald-600" />
              Search Results
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredTransactions.length} transactions found)
              </span>
            </h3>
            
            {filteredTransactions.length > 0 ? (
              <div className="space-y-4">
                {/* Group transactions by date */}
                {Object.entries(
                  filteredTransactions.reduce((groups, transaction) => {
                    const date = transaction.date;
                    if (!groups[date]) {
                      groups[date] = [];
                    }
                    groups[date].push(transaction);
                    return groups;
                  }, {} as Record<string, typeof filteredTransactions>)
                ).map(([date, dayTransactions]) => (
                  <div key={date} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    {/* Date Header */}
                    <div className="bg-gradient-to-r from-blue-50 to-emerald-50 px-6 py-3 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Calendar size={16} className="text-blue-600" />
                          <span className="font-semibold text-gray-800">
                            {new Date(date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {dayTransactions.length} transaction{dayTransactions.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    
                    {/* Transactions for this date */}
                    <div className="divide-y divide-gray-100">
                      {dayTransactions.map((transaction, index) => (
                        <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                transaction.type === 'in' 
                                  ? 'bg-emerald-100 text-emerald-600' 
                                  : 'bg-red-100 text-red-600'
                              }`}>
                                {transaction.type === 'in' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-800">
                                    {transaction.type === 'in' ? 'Cash In' : 'Cash Out'}
                                  </span>
                                  <span className="text-sm text-gray-500">by {transaction.user}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{transaction.remark}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(transaction.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-lg font-bold ${
                                transaction.type === 'in' ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                                {transaction.type === 'in' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <Search size={48} className="mx-auto text-gray-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-600 mb-2">No transactions found</h4>
                <p className="text-gray-500">
                  Try adjusting your search terms or date filters
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}