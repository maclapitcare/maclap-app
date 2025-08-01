import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { MeterReading, insertMeterReadingSchema } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, User, LogOut, Gauge, TrendingUp, TrendingDown, Calendar, Clock, Zap, Activity, BarChart3, Sparkles, Edit, Trash2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MeterReadings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    reading: "",
    remark: ""
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    date: "",
    reading: "",
    remark: ""
  });
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      query(collection(db, "meterReadings"), orderBy("timestamp", "desc")),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ 
          ...doc.data(), 
          id: doc.id 
        } as unknown as MeterReading));
        setMeterReadings(data);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const readingData = {
        ...formData,
        reading: parseFloat(formData.reading),
        user: user.name,
        timestamp: Date.now()
      };

      const validatedData = insertMeterReadingSchema.parse(readingData);
      
      await addDoc(collection(db, "meterReadings"), validatedData);
      
      setFormData({
        date: new Date().toISOString().split('T')[0],
        reading: "",
        remark: ""
      });

      toast({
        title: "Meter reading added",
        description: "Meter reading has been saved successfully.",
      });
    } catch (error) {
      console.error("Error adding meter reading:", error);
      toast({
        title: "Error",
        description: "Failed to add meter reading. Please try again.",
        variant: "destructive",
      });
    }
  };

  const calculateDifference = (index: number) => {
    if (index === meterReadings.length - 1) return null;
    const current = meterReadings[index];
    const previous = meterReadings[index + 1];
    return current.reading - previous.reading;
  };

  const handleEdit = (reading: MeterReading) => {
    setEditingId(String(reading.id));
    setEditFormData({
      date: reading.date,
      reading: reading.reading.toString(),
      remark: reading.remark
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({ date: "", reading: "", remark: "" });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !user) return;

    try {
      const readingData = {
        date: editFormData.date,
        reading: parseFloat(editFormData.reading),
        remark: editFormData.remark,
        user: user.name,
        timestamp: Date.now()
      };

      const validatedData = insertMeterReadingSchema.parse(readingData);
      
      await updateDoc(doc(db, "meterReadings", editingId), validatedData);
      
      setEditingId(null);
      setEditFormData({ date: "", reading: "", remark: "" });

      toast({
        title: "Reading updated",
        description: "Meter reading has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating meter reading:", error);
      toast({
        title: "Error",
        description: "Failed to update meter reading. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (readingId: string) => {
    setShowDeleteConfirm(readingId);
  };

  const handleDeleteConfirm = async () => {
    if (!showDeleteConfirm) return;

    if (deletePassword !== "maclap1122") {
      toast({
        title: "Access Denied",
        description: "Invalid delete password",
        variant: "destructive"
      });
      setDeletePassword("");
      return;
    }

    try {
      await deleteDoc(doc(db, "meterReadings", showDeleteConfirm));
      
      setShowDeleteConfirm(null);
      setDeletePassword("");

      toast({
        title: "Reading deleted",
        description: "Meter reading has been permanently deleted",
      });
    } catch (error) {
      console.error("Error deleting meter reading:", error);
      toast({
        title: "Error",
        description: "Failed to delete meter reading",
        variant: "destructive"
      });
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(null);
    setDeletePassword("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 pb-20">
      {/* User Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 text-white p-4 rounded-2xl shadow-lg mx-4 mt-4 mb-6">
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

      {/* Header Section */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 text-white p-6 rounded-3xl shadow-2xl mx-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Gauge size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Meter Readings</h1>
              <p className="text-white/70 text-sm">Track utility consumption and monitor usage</p>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{meterReadings.length}</p>
              <p className="text-white/70 text-xs">Total Readings</p>
            </div>
            {meterReadings.length > 1 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-300">
                  {calculateDifference(0) || 0}
                </p>
                <p className="text-white/70 text-xs">Latest Usage</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Meter Reading Form */}
      <div className="mx-4 mb-6">
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-xl">
                <Plus size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Add New Reading</h3>
                <p className="text-gray-600 text-sm">Record your latest meter reading</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <Calendar size={14} />
                    <span>Date</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reading" className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <Gauge size={14} />
                    <span>Reading Number</span>
                  </Label>
                  <Input
                    id="reading"
                    type="number"
                    placeholder="Enter reading"
                    value={formData.reading}
                    onChange={(e) => setFormData({ ...formData, reading: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-lg font-semibold"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="remark" className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <Sparkles size={14} />
                    <span>Remark</span>
                  </Label>
                  <Input
                    id="remark"
                    type="text"
                    placeholder="Reading notes"
                    value={formData.remark}
                    onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                    required
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
              >
                <Zap size={18} className="mr-2" />
                Record Reading
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Meter Readings History */}
      <div className="mx-4">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
            <BarChart3 size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Reading History</h3>
            <p className="text-gray-600 text-sm">Track your meter consumption over time</p>
          </div>
        </div>

        {meterReadings.length === 0 ? (
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Activity size={32} className="text-gray-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-600 mb-2">No readings yet</h4>
              <p className="text-gray-500">Start by adding your first meter reading above</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {meterReadings.map((reading, index) => {
              const difference = calculateDifference(index);
              const isLatest = index === 0;
              
              return (
                <Card key={reading.id} className={`bg-white/70 backdrop-blur-sm border-0 shadow-xl transition-all duration-200 hover:shadow-2xl hover:scale-[1.02] ${isLatest ? 'ring-2 ring-blue-500/20' : ''}`}>
                  <CardContent className="p-6">
                    {editingId === String(reading.id) ? (
                      // Edit mode
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2 mb-4">
                          <Edit size={20} className="text-blue-600" />
                          <h4 className="text-lg font-bold text-gray-800">Edit Reading</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="edit-date" className="text-sm font-medium text-gray-700">Date</Label>
                            <Input
                              id="edit-date"
                              type="date"
                              value={editFormData.date}
                              onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-reading" className="text-sm font-medium text-gray-700">Reading</Label>
                            <Input
                              id="edit-reading"
                              type="number"
                              value={editFormData.reading}
                              onChange={(e) => setEditFormData({ ...editFormData, reading: e.target.value })}
                              className="mt-1"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-remark" className="text-sm font-medium text-gray-700">Remark</Label>
                            <Input
                              id="edit-remark"
                              type="text"
                              value={editFormData.remark}
                              onChange={(e) => setEditFormData({ ...editFormData, remark: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={handleSaveEdit}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save size={16} className="mr-2" />
                            Save Changes
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            variant="outline"
                            className="border-gray-300"
                          >
                            <X size={16} className="mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`p-3 rounded-xl ${isLatest ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'}`}>
                              <Gauge size={20} className="text-white" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="text-xl font-bold text-gray-800">{reading.reading.toLocaleString()}</h4>
                                {isLatest && (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                    Latest
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 text-sm">{reading.remark}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {difference !== null && (
                              <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl ${
                                difference > 0 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {difference > 0 ? (
                                  <TrendingUp size={16} />
                                ) : (
                                  <TrendingDown size={16} />
                                )}
                                <span className="font-semibold">
                                  {difference > 0 ? "+" : ""}{difference}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-1">
                              <Button
                                onClick={() => handleEdit(reading)}
                                size="sm"
                                variant="outline"
                                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                              >
                                <Edit size={14} />
                              </Button>
                              <Button
                                onClick={() => handleDeleteClick(String(reading.id))}
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Calendar size={14} />
                              <span>{reading.date}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock size={14} />
                              <span>{new Date(reading.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <User size={14} />
                              <span>{reading.user}</span>
                            </div>
                          </div>
                          
                          {difference !== null && (
                            <div className="text-xs text-gray-400">
                              Usage from previous reading
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-xl">
                  <Trash2 size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Delete Meter Reading</h3>
                  <p className="text-gray-600 text-sm">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="delete-password" className="text-sm font-medium text-gray-700">
                    Enter delete password to confirm
                  </Label>
                  <Input
                    id="delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Delete password"
                    className="mt-1"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleDeleteConfirm}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete Reading
                  </Button>
                  <Button
                    onClick={handleCancelDelete}
                    variant="outline"
                    className="border-gray-300"
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
