import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, User, ArrowLeft, LogIn, Fingerprint, Shield } from "lucide-react";

export default function Login() {
  const [selectedUser, setSelectedUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithFingerprint, registerFingerprint, hasFingerprintRegistered } = useAuth();
  const [, setLocation] = useLocation();

  const users = [
    { name: "Puneet", role: "Administrator", avatar: "P", color: "bg-blue-600" },
    { name: "Sonu", role: "Administrator", avatar: "S", color: "bg-emerald-600" }
  ];

  const handleUserSelect = (username: string) => {
    setSelectedUser(username);
    setPassword("");
    setError("");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    if (login(selectedUser, password)) {
      setLocation("/");
    } else {
      setError("Invalid credentials");
    }
    setIsLoading(false);
  };

  const handleFingerprintLogin = async (username: string) => {
    setError("");
    setIsLoading(true);
    
    try {
      const success = await loginWithFingerprint(username);
      if (success) {
        setLocation("/");
      } else {
        setError("Fingerprint authentication failed");
      }
    } catch (error: any) {
      setError(error.message || "Fingerprint authentication failed");
    }
    setIsLoading(false);
  };

  const handleRegisterFingerprint = async () => {
    if (!password) {
      setError("Please enter your password first");
      return;
    }
    
    setError("");
    setIsLoading(true);
    
    try {
      const success = await registerFingerprint(selectedUser, password);
      if (success) {
        setError("");
        alert("Fingerprint registered successfully! You can now use fingerprint login.");
      } else {
        setError("Failed to register fingerprint");
      }
    } catch (error: any) {
      setError(error.message || "Failed to register fingerprint");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-128 h-128 bg-white/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <Card className="w-full max-w-md mx-4 backdrop-blur-xl bg-white/95 border-0 shadow-2xl relative z-10">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <Building2 size={32} className="text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent animate-pulse">
                MacLap IT Care
              </h1>
              <p className="text-slate-500 font-medium">💼 Cash Management System 💰</p>
            </div>
          </div>
          
          {!selectedUser ? (
            <div className="space-y-4 animate-fadeIn">
              {users.map((user, index) => (
                <div
                  key={user.name}
                  className="transform hover:scale-105 transition-all duration-200 animate-slideUp"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleUserSelect(user.name)}
                      variant="outline"
                      className="w-full h-16 flex items-center space-x-4 text-left border-2 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 group"
                    >
                      <div className={`w-12 h-12 ${user.color} rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:shadow-lg transition-shadow duration-200`}>
                        {user.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800 text-lg">{user.name}</div>
                        <div className="text-slate-500 text-sm">{user.role}</div>
                      </div>
                      <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <LogIn size={20} />
                      </div>
                    </Button>
                    
                    {hasFingerprintRegistered(user.name) && (
                      <Button
                        onClick={() => handleFingerprintLogin(user.name)}
                        disabled={isLoading}
                        className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <Fingerprint size={18} />
                        <span>Login with Fingerprint</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="animate-slideIn">
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Selected User Display */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-emerald-50 px-6 py-3 rounded-2xl border border-blue-200">
                    <div className={`w-10 h-10 ${users.find(u => u.name === selectedUser)?.color} rounded-xl flex items-center justify-center text-white font-bold shadow-md`}>
                      {users.find(u => u.name === selectedUser)?.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{selectedUser}</div>
                      <div className="text-slate-500 text-sm">{users.find(u => u.name === selectedUser)?.role}</div>
                    </div>
                  </div>
                </div>
                
                {/* Password Input */}
                <div className="space-y-2">
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoFocus
                    className="h-12 text-center text-lg font-medium border-2 focus:border-blue-400 rounded-xl"
                  />
                </div>
                
                {error && (
                  <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200 animate-shake">
                    {error}
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  <div className="flex space-x-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setSelectedUser("")}
                      disabled={isLoading}
                      className="flex-1 h-12 rounded-xl border-2 hover:bg-slate-50"
                    >
                      <ArrowLeft size={18} className="mr-2" />
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <LogIn size={18} className="mr-2" />
                      {isLoading ? "Signing In..." : "Sign In"}
                    </Button>
                  </div>
                  
                  {/* Fingerprint Options */}
                  <div className="pt-2 border-t border-slate-200">
                    {hasFingerprintRegistered(selectedUser) ? (
                      <Button
                        type="button"
                        onClick={() => handleFingerprintLogin(selectedUser)}
                        disabled={isLoading}
                        className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <Fingerprint size={18} />
                        <span>{isLoading ? "Authenticating..." : "Login with Fingerprint"}</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleRegisterFingerprint}
                        disabled={isLoading || !password}
                        variant="outline"
                        className="w-full h-12 border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <Shield size={18} />
                        <span>{isLoading ? "Registering..." : "Setup Fingerprint Login"}</span>
                      </Button>
                    )}
                    <p className="text-xs text-slate-500 text-center mt-2">
                      {hasFingerprintRegistered(selectedUser) 
                        ? "Use your registered fingerprint for quick login" 
                        : "Enter password first, then setup fingerprint for future logins"}
                    </p>
                  </div>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
}
