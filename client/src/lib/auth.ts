import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { notificationManager } from './notifications';

interface User {
  name: string;
  username: string;
  role: 'admin' | 'super_admin';
}

interface AuthState {
  user: User | null;
  login: (username: string, password: string) => boolean;
  loginWithFingerprint: (username: string) => Promise<boolean>;
  registerFingerprint: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasFingerprintRegistered: (username: string) => boolean;
  isSuperAdmin: () => boolean;
}

const users = [
  { name: "Puneet", username: "Puneet", password: "maclap2102", role: "super_admin" as const },
  { name: "Sonu", username: "Sonu", password: "maclap9811", role: "admin" as const }
];

// Helper functions for WebAuthn
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// Check if WebAuthn is supported
const isWebAuthnSupported = (): boolean => {
  try {
    return !!(typeof navigator !== 'undefined' && 
             navigator.credentials && 
             'create' in navigator.credentials && 
             'get' in navigator.credentials &&
             typeof window !== 'undefined' &&
             'PublicKeyCredential' in window);
  } catch {
    return false;
  }
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      login: (username: string, password: string) => {
        const foundUser = users.find(u => u.username === username && u.password === password);
        if (foundUser) {
          const userObj = { name: foundUser.name, username: foundUser.username, role: foundUser.role };

          set({ user: userObj });
          
          // Check if notifications are enabled and schedule daily reminders
          const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
          if (notificationsEnabled) {
            notificationManager.scheduleDailyReminder(userObj.username);
          }
          
          return true;
        }

        return false;
      },
      
      registerFingerprint: async (username: string, password: string) => {
        if (!isWebAuthnSupported()) {
          throw new Error('Fingerprint authentication is not supported on this device');
        }

        // Verify password first
        const foundUser = users.find(u => u.username === username && u.password === password);
        if (!foundUser) {
          return false;
        }

        try {
          const credential = await navigator.credentials.create({
            publicKey: {
              challenge: new Uint8Array(32),
              rp: {
                name: "MacLap Cash Tracker",
                id: window.location.hostname,
              },
              user: {
                id: new TextEncoder().encode(username),
                name: username,
                displayName: foundUser.name,
              },
              pubKeyCredParams: [{alg: -7, type: "public-key"}],
              authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required"
              },
              timeout: 60000,
              attestation: "direct"
            }
          }) as PublicKeyCredential;

          if (credential) {
            // Store credential info in localStorage
            const credentialData = {
              id: credential.id,
              rawId: arrayBufferToBase64(credential.rawId),
              type: credential.type,
            };
            localStorage.setItem(`fingerprint_${username}`, JSON.stringify(credentialData));
            return true;
          }
        } catch (error) {
          console.error('Fingerprint registration failed:', error);
          throw error;
        }
        
        return false;
      },

      loginWithFingerprint: async (username: string) => {
        if (!isWebAuthnSupported()) {
          throw new Error('Fingerprint authentication is not supported on this device');
        }

        const storedCredential = localStorage.getItem(`fingerprint_${username}`);
        if (!storedCredential) {
          throw new Error('No fingerprint registered for this user');
        }

        const foundUser = users.find(u => u.username === username);
        if (!foundUser) {
          return false;
        }

        try {
          const credentialData = JSON.parse(storedCredential);
          
          const assertion = await navigator.credentials.get({
            publicKey: {
              challenge: new Uint8Array(32),
              allowCredentials: [{
                id: base64ToArrayBuffer(credentialData.rawId),
                type: "public-key"
              }],
              userVerification: "required",
              timeout: 60000,
            }
          });

          if (assertion) {
            const userObj = { name: foundUser.name, username: foundUser.username, role: foundUser.role };
            set({ user: userObj });
            
            // Check if notifications are enabled and schedule daily reminders
            const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
            if (notificationsEnabled) {
              notificationManager.scheduleDailyReminder(userObj.username);
            }
            
            return true;
          }
        } catch (error) {
          console.error('Fingerprint login failed:', error);
          throw error;
        }
        
        return false;
      },

      hasFingerprintRegistered: (username: string) => {
        return !!localStorage.getItem(`fingerprint_${username}`);
      },

      logout: () => {

        set({ user: null });
      },
      isAuthenticated: () => get().user !== null,
      isSuperAdmin: () => get().user?.role === 'super_admin',
    }),
    {
      name: 'auth-storage',
    }
  )
);
