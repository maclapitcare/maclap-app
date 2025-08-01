import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Transaction, PendingPayment } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    const now = new Date();
    let filtered = [...transactions];

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

    // Apply search filters
    if (searchQuery.trim()) {
      filtered = filtered.filter(t => 
        t.remark.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.amount.toString().includes(searchQuery) ||
        t.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
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

  const getPeriodDisplayName = () => {
    switch (selectedRange) {
      case "today":
        return "Today's Activity";
      case "yesterday":
        return "Yesterday's Activity";
      case "weekly":
        return "This Week's Activity";
      case "monthly":
        return "This Month's Activity";
      case "yearly":
        return "This Year's Activity";
      case "january":
        return `January ${selectedYear} Activity`;
      case "february":
        return `February ${selectedYear} Activity`;
      case "march":
        return `March ${selectedYear} Activity`;
      case "april":
        return `April ${selectedYear} Activity`;
      case "may":
        return `May ${selectedYear} Activity`;
      case "june":
        return `June ${selectedYear} Activity`;
      case "july":
        return `July ${selectedYear} Activity`;
      case "august":
        return `August ${selectedYear} Activity`;
      case "september":
        return `September ${selectedYear} Activity`;
      case "october":
        return `October ${selectedYear} Activity`;
      case "november":
        return `November ${selectedYear} Activity`;
      case "december":
        return `December ${selectedYear} Activity`;
      default:
        return "Activity";
    }
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

  // Get transaction type distribution
  const getTransactionTypeData = () => [
    { name: 'Cash In', value: summary.totalIn, color: '#10b981' },
    { name: 'Cash Out', value: summary.totalOut, color: '#ef4444' }
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
  const transactionTypeData = getTransactionTypeData();
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

      {/* Clean Header Section */}
      <div className="mx-4 mb-6">
        {/* User Header with Logout */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
              <p className="text-gray-600">{getPeriodDisplayName()}</p>
            </div>
          </div>
          <Button 
            onClick={logout} 
            variant="outline" 
            size="sm"
            className="border-gray-300 hover:bg-gray-50"
          >
            <LogOut size={16} className="mr-2" />
            Logout
          </Button>
        </div>

        {/* Time Range and Search Controls */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Time Range Selector */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar size={20} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Period:</span>
              </div>
              <Select value={selectedRange} onValueChange={(value: TimeRange) => setSelectedRange(value)}>
                <SelectTrigger className="w-40 bg-gray-50 border-gray-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="weekly">This Week</SelectItem>
                  <SelectItem value="monthly">This Month</SelectItem>
                  <SelectItem value="yearly">This Year</SelectItem>
                  <SelectItem value="january">January</SelectItem>
                  <SelectItem value="february">February</SelectItem>
                  <SelectItem value="march">March</SelectItem>
                  <SelectItem value="april">April</SelectItem>
                  <SelectItem value="may">May</SelectItem>
                  <SelectItem value="june">June</SelectItem>
                  <SelectItem value="july">July</SelectItem>
                  <SelectItem value="august">August</SelectItem>
                  <SelectItem value="september">September</SelectItem>
                  <SelectItem value="october">October</SelectItem>
                  <SelectItem value="november">November</SelectItem>
                  <SelectItem value="december">December</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Year Picker - Show when specific month is selected */}
              {["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].includes(selectedRange) && (
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className="w-24 bg-gray-50 border-gray-200 rounded-xl h-10">
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

            {/* Search Controls */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1 lg:max-w-md">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-50 border-gray-200 rounded-xl h-10"
                />
              </div>
              <Input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="bg-gray-50 border-gray-200 rounded-xl h-10 w-full sm:w-40"
              />
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
      </div>
    </div>
  );
}
                      <div className="text-gray-500 text-sm">Net Balance</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div className="text-center">
                      <div className="text-emerald-600 font-semibold">₹{balance.in.toLocaleString()}</div>
                      <div className="text-gray-500 text-xs">Cash In</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-600 font-semibold">₹{balance.out.toLocaleString()}</div>
                      <div className="text-gray-500 text-xs">Cash Out</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
                  <p className="text-2xl font-bold text-amber-600">{summary.pendingCount}</p>
                </div>
                <div className="bg-amber-500 p-3 rounded-2xl shadow-lg">
                  <Clock className="text-white" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Period Analytics Section */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50">
          <CardContent className="p-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1">Period Analytics</h3>
                  <p className="text-slate-300 text-sm">
                    {selectedRange.charAt(0).toUpperCase() + selectedRange.slice(1)} overview
                  </p>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <Target size={16} className="text-white" />
                  <span className="text-sm font-medium text-white">
                    {summary.transactionCount} transactions
                  </span>
                </div>
              </div>
            </div>

            {/* Analytics Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Cash In */}
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-2xl shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <TrendingUp size={24} className="text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-100 text-sm font-medium">Total Income</p>
                      <p className="text-xs text-emerald-200">Cash In</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-1">₹{summary.totalIn.toLocaleString()}</div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-300 rounded-full"></div>
                    <span className="text-emerald-100 text-sm">Positive flow</span>
                  </div>
                </div>

                {/* Cash Out */}
                <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-2xl shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <TrendingDown size={24} className="text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-red-100 text-sm font-medium">Total Expenses</p>
                      <p className="text-xs text-red-200">Cash Out</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-1">₹{summary.totalOut.toLocaleString()}</div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-300 rounded-full"></div>
                    <span className="text-red-100 text-sm">Negative flow</span>
                  </div>
                </div>

                {/* Net Balance */}
                <div className={`bg-gradient-to-br ${summary.netBalance >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} text-white p-6 rounded-2xl shadow-lg`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Wallet size={24} className="text-white" />
                    </div>
                    <div className="text-right">
                      <p className={`${summary.netBalance >= 0 ? 'text-blue-100' : 'text-orange-100'} text-sm font-medium`}>Net Balance</p>
                      <p className={`text-xs ${summary.netBalance >= 0 ? 'text-blue-200' : 'text-orange-200'}`}>Overall flow</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-1">
                    {summary.netBalance >= 0 ? '+' : ''}₹{Math.abs(summary.netBalance).toLocaleString()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 ${summary.netBalance >= 0 ? 'bg-blue-300' : 'bg-orange-300'} rounded-full`}></div>
                    <span className={`${summary.netBalance >= 0 ? 'text-blue-100' : 'text-orange-100'} text-sm`}>
                      {summary.netBalance >= 0 ? 'Profit' : 'Loss'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="mt-6 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{summary.transactionCount}</p>
                    <p className="text-sm text-slate-600">Transactions</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{summary.pendingCount}</p>
                    <p className="text-sm text-slate-600">Pending</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">
                      {summary.totalIn > 0 ? Math.round((summary.totalIn / (summary.totalIn + summary.totalOut)) * 100) : 0}%
                    </p>
                    <p className="text-sm text-slate-600">Income Ratio</p>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${summary.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {summary.totalOut > 0 ? Math.round(Math.abs(summary.netBalance / summary.totalOut) * 100) : 0}%
                    </p>
                    <p className="text-sm text-slate-600">Net Margin</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Results Section */}
        {(searchQuery.trim() || searchDate) && (
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500 rounded-xl">
                    <Search className="text-white" size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Search Results</h3>
                    <p className="text-slate-600 text-sm">
                      Found {filteredTransactions.length} transactions
                      {searchQuery && ` for "${searchQuery}"`}
                      {searchDate && ` on ${new Date(searchDate).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchDate("");
                  }}
                  variant="outline"
                  size="sm"
                  className="text-slate-600 hover:text-slate-900"
                >
                  Clear
                </Button>
              </div>

              {filteredTransactions.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          transaction.type === 'in' 
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
                            : 'bg-gradient-to-br from-red-500 to-red-600'
                        }`}>
                          {transaction.type === 'in' ? (
                            <ArrowUp className="text-white" size={16} />
                          ) : (
                            <ArrowDown className="text-white" size={16} />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{transaction.remark}</p>
                          <p className="text-sm text-slate-600">
                            {transaction.user} • {new Date(transaction.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          transaction.type === 'in' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'in' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500 capitalize">{transaction.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="mx-auto text-slate-400 mb-3" size={48} />
                  <p className="text-slate-600 font-medium">No transactions found</p>
                  <p className="text-slate-400 text-sm">Try adjusting your search criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}