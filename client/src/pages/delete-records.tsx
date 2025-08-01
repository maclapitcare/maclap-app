import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from "firebase/firestore";
import { Transaction, PendingPayment, MeterReading, Note } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AllRecord = {
  id: string;
  type: "transaction" | "pending" | "meter" | "note";
  date: string;
  details: string;
  user: string;
  timestamp: number;
  data: Transaction | PendingPayment | MeterReading | Note;
};

export default function DeleteRecords() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [allRecords, setAllRecords] = useState<AllRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AllRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    type: "all",
    dateFrom: "",
    dateTo: ""
  });

  useEffect(() => {
    if (!user || !isUnlocked) return;

    const unsubscribes: (() => void)[] = [];

    // Subscribe to transactions
    unsubscribes.push(
      onSnapshot(
        query(collection(db, "transactions"), orderBy("timestamp", "desc")),
        (snapshot) => {
          const transactionRecords: AllRecord[] = snapshot.docs.map(doc => {
            const data = doc.data() as Transaction;
            return {
              id: doc.id,
              type: "transaction",
              date: data.date,
              details: `Cash ${data.type === "in" ? "In" : "Out"} - ₹${data.amount.toLocaleString()} (${data.remark})`,
              user: data.user,
              timestamp: data.timestamp,
              data
            };
          });
          updateRecords("transactions", transactionRecords);
        }
      )
    );

    // Subscribe to pending payments
    unsubscribes.push(
      onSnapshot(
        query(collection(db, "pending"), orderBy("timestamp", "desc")),
        (snapshot) => {
          const pendingRecords: AllRecord[] = snapshot.docs.map(doc => {
            const data = doc.data() as PendingPayment;
            return {
              id: doc.id,
              type: "pending",
              date: data.date,
              details: `Pending - ₹${data.amount.toLocaleString()} (${data.remark})`,
              user: data.user,
              timestamp: data.timestamp,
              data
            };
          });
          updateRecords("pending", pendingRecords);
        }
      )
    );

    // Subscribe to meter readings
    unsubscribes.push(
      onSnapshot(
        query(collection(db, "meterReadings"), orderBy("timestamp", "desc")),
        (snapshot) => {
          const meterRecords: AllRecord[] = snapshot.docs.map(doc => {
            const data = doc.data() as MeterReading;
            return {
              id: doc.id,
              type: "meter",
              date: data.date,
              details: `Meter Reading - ${data.reading} (${data.remark})`,
              user: data.user,
              timestamp: data.timestamp,
              data
            };
          });
          updateRecords("meter", meterRecords);
        }
      )
    );

    // Subscribe to notes
    unsubscribes.push(
      onSnapshot(
        query(collection(db, "notes"), orderBy("timestamp", "desc")),
        (snapshot) => {
          const noteRecords: AllRecord[] = snapshot.docs.map(doc => {
            const data = doc.data() as Note;
            return {
              id: doc.id,
              type: "note",
              date: data.date,
              details: `Note - ${data.title}`,
              user: data.user,
              timestamp: data.timestamp,
              data
            };
          });
          updateRecords("notes", noteRecords);
          setLoading(false);
        }
      )
    );

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [user, isUnlocked]);

  const recordsMap = new Map<string, AllRecord[]>();

  const updateRecords = (type: string, records: AllRecord[]) => {
    recordsMap.set(type, records);
    
    const combined = Array.from(recordsMap.values())
      .flat()
      .sort((a, b) => b.timestamp - a.timestamp);
    
    setAllRecords(combined);
  };

  useEffect(() => {
    let filtered = allRecords;

    if (filter.type !== "all") {
      filtered = filtered.filter(record => {
        switch (filter.type) {
          case "transactions":
            return record.type === "transaction";
          case "pending":
            return record.type === "pending";
          case "meter":
            return record.type === "meter";
          case "notes":
            return record.type === "note";
          default:
            return true;
        }
      });
    }

    if (filter.dateFrom) {
      filtered = filtered.filter(record => record.date >= filter.dateFrom);
    }

    if (filter.dateTo) {
      filtered = filtered.filter(record => record.date <= filter.dateTo);
    }

    setFilteredRecords(filtered);
  }, [allRecords, filter]);

  const handleUnlock = () => {
    if (password === "maclap1122") {
      setIsUnlocked(true);
      setPassword("");
    } else {
      toast({
        title: "Incorrect password",
        description: "Please enter the correct admin password.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (record: AllRecord) => {
    if (!confirm("Are you sure you want to delete this record? This action cannot be undone.")) {
      return;
    }

    try {
      const collectionName = {
        transaction: "transactions",
        pending: "pending",
        meter: "meterReadings",
        note: "notes"
      }[record.type];

      await deleteDoc(doc(db, collectionName, record.id));

      toast({
        title: "Record deleted",
        description: "The record has been permanently deleted.",
      });
    } catch (error) {
      console.error("Error deleting record:", error);
      toast({
        title: "Error",
        description: "Failed to delete record. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isUnlocked) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Delete Records</h2>
          <p className="text-red-600 text-sm">⚠️ This section is protected. Enter the admin password to access delete functionality.</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <Lock className="mr-2" size={20} />
              Admin Authentication Required
            </h3>
            <div className="max-w-md">
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Password
              </Label>
              <div className="flex space-x-3">
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleUnlock()}
                />
                <Button onClick={handleUnlock} variant="destructive">
                  Unlock
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Hint: maclap1122</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Delete Records</h2>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Filter Records</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Record Type
              </Label>
              <Select value={filter.type} onValueChange={(value) => setFilter({ ...filter, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Records</SelectItem>
                  <SelectItem value="transactions">Transactions</SelectItem>
                  <SelectItem value="pending">Pending Payments</SelectItem>
                  <SelectItem value="meter">Meter Readings</SelectItem>
                  <SelectItem value="notes">Notes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </Label>
              <Input
                id="dateFrom"
                type="date"
                value={filter.dateFrom}
                onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </Label>
              <Input
                id="dateTo"
                type="date"
                value={filter.dateTo}
                onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records to Delete */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Records Available for Deletion</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No records found matching the current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>
                        <Badge variant={
                          record.type === "transaction" ? "default" :
                          record.type === "pending" ? "secondary" :
                          record.type === "meter" ? "outline" : "default"
                        }>
                          {record.type === "transaction" ? "Transaction" :
                           record.type === "pending" ? "Pending" :
                           record.type === "meter" ? "Meter" : "Note"}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.details}</TableCell>
                      <TableCell>{record.user}</TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDelete(record)}
                        >
                          <Trash2 size={12} className="mr-1" />
                          Delete
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
    </div>
  );
}
