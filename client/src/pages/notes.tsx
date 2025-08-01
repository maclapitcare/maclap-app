import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Note, insertNoteSchema } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, StickyNote, User, LogOut, Edit3, Calendar, Clock, Search, Filter, BookOpen, Sparkles, Trash2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Notes() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    title: "",
    content: ""
  });

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      query(collection(db, "notes"), orderBy("timestamp", "desc")),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ 
          ...doc.data(), 
          id: doc.id 
        } as unknown as Note));
        setNotes(data);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Auto-generate title from first line of content
  const generateTitle = (content: string): string => {
    if (!content.trim()) return "Untitled Note";
    
    const firstLine = content.split('\n')[0].trim();
    if (firstLine.length > 50) {
      return firstLine.substring(0, 47) + "...";
    }
    return firstLine || "Untitled Note";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const autoTitle = generateTitle(formData.content);
      
      const noteData = {
        ...formData,
        title: autoTitle,
        user: user.name,
        timestamp: editingNote ? editingNote.timestamp : Date.now()
      };

      if (editingNote) {
        // Update existing note
        // @ts-ignore - Firebase type issue
        await updateDoc(doc(db, "notes", editingNote.id), noteData);
        
        toast({
          title: "Note updated",
          description: `"${autoTitle}" has been updated successfully.`,
        });
        
        setEditingNote(null);
      } else {
        // Create new note
        const validatedData = insertNoteSchema.parse(noteData);
        await addDoc(collection(db, "notes"), validatedData);
        
        toast({
          title: "Note saved",
          description: `"${autoTitle}" has been added successfully.`,
        });
      }
      
      setFormData({
        date: new Date().toISOString().split('T')[0],
        title: "",
        content: ""
      });
      
      setShowForm(false);

    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({
      date: note.date,
      title: note.title,
      content: note.content
    });
    setShowForm(true);
  };

  const handleDelete = (note: Note) => {
    setNoteToDelete(note);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;

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
      // @ts-ignore - Firebase type issue
      const noteDocRef = doc(db, "notes", noteToDelete.id);
      await deleteDoc(noteDocRef);
      
      toast({
        title: "Note deleted",
        description: `"${noteToDelete.title}" has been deleted successfully.`,
      });
      
      setShowDeleteModal(false);
      setNoteToDelete(null);
      setDeletePassword("");
      
    } catch (error) {
      console.error("Error deleting note:", error);
      toast({
        title: "Error",
        description: "Failed to delete note. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setNoteToDelete(null);
    setDeletePassword("");
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      title: "",
      content: ""
    });
    setShowForm(false);
  };

  // Filter notes based on search query
  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.user.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <BookOpen size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Notes</h1>
              <p className="text-white/70 text-sm">Your digital notebook</p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-white/20 text-white hover:bg-white/30 border-0 backdrop-blur-sm shadow-lg transition-all duration-200 rounded-xl"
          >
            <Plus size={18} className="mr-2" />
            New Note
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70" />
          <Input
            placeholder="Search notes by title, content, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl backdrop-blur-sm h-12"
          />
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Add Note Form */}
        {showForm && (
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm animate-slideDown">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500 rounded-xl">
                    <Edit3 className="text-white" size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {editingNote ? "Edit Note" : "Create New Note"}
                    </h3>
                    <p className="text-slate-600 text-sm">Title will be auto-generated from first line</p>
                  </div>
                </div>
                <Button
                  onClick={editingNote ? handleCancelEdit : () => setShowForm(false)}
                  variant="outline"
                  size="sm"
                  className="text-slate-600 hover:text-slate-900"
                >
                  <X size={16} className="mr-1" />
                  Cancel
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl border border-blue-200">
                  <Calendar size={18} className="text-blue-600" />
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="border-0 bg-transparent text-slate-800 font-medium"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-slate-700">
                    <Sparkles size={16} className="text-emerald-500" />
                    <span className="text-sm font-medium">Note Content</span>
                    {formData.content && (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                        Title: "{generateTitle(formData.content)}"
                      </span>
                    )}
                  </div>
                  <Textarea
                    rows={6}
                    placeholder="Start typing your note... The first line will become the title automatically."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                    className="border-2 border-slate-200 focus:border-blue-400 rounded-xl resize-none"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {editingNote ? (
                      <>
                        <Save size={16} className="mr-2" />
                        Update Note
                      </>
                    ) : (
                      <>
                        <Plus size={16} className="mr-2" />
                        Save Note
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Notes List */}
        <div className="space-y-4">
          {filteredNotes.length === 0 ? (
            <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
              <CardContent className="p-12">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <StickyNote size={40} className="text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {searchQuery ? "No matching notes" : "No notes yet"}
                  </h3>
                  <p className="text-slate-600 mb-6">
                    {searchQuery 
                      ? `No notes found for "${searchQuery}". Try a different search term.`
                      : "Start building your digital notebook by creating your first note."
                    }
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={() => setShowForm(true)}
                      className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Plus size={16} className="mr-2" />
                      Create First Note
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredNotes.map((note) => (
              <Card key={note.id} className="border-0 shadow-lg bg-white/90 backdrop-blur-sm hover:shadow-xl transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight">{note.title}</h3>
                      <div className="flex items-center space-x-4 text-sm text-slate-500">
                        <div className="flex items-center space-x-1">
                          <Calendar size={14} />
                          <span>{new Date(note.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User size={14} />
                          <span>{note.user}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock size={14} />
                          <span>{new Date(note.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2 ml-2 sm:ml-4 flex-shrink-0">
                      <Button
                        onClick={() => handleEdit(note)}
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0 border-blue-200 hover:border-blue-400 hover:bg-blue-50"
                      >
                        <Edit3 size={12} className="sm:size-[14px] text-blue-600" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(note)}
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0 border-red-200 hover:border-red-400 hover:bg-red-50"
                      >
                        <Trash2 size={12} className="sm:size-[14px] text-red-600" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && noteToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-xl">
                  <Trash2 size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Delete Note</h3>
                  <p className="text-gray-600 text-sm">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">
                  You are about to delete:
                </p>
                <p className="font-semibold text-gray-900">"{noteToDelete.title}"</p>
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleDeleteConfirm();
                      }
                    }}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleDeleteConfirm}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete Note
                  </Button>
                  <Button
                    onClick={handleDeleteCancel}
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
