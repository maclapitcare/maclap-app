import { openDB } from 'idb';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

let offlineDB: any;

interface OfflineRecord {
  id: string;
  type: 'transaction' | 'pendingPayment' | 'meterReading' | 'note';
  data: any;
  synced: boolean;
  timestamp: number;
  retries: number;
}

// Initialize offline database
export async function initOfflineDB() {
  if (offlineDB) return offlineDB;
  
  try {
    offlineDB = await openDB('MacLapCashTracker', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('offlineData')) {
          const store = db.createObjectStore('offlineData', { keyPath: 'id' });
          store.createIndex('type', 'type');
          store.createIndex('synced', 'synced');
          store.createIndex('timestamp', 'timestamp');
        }
      },
    });
    
    return offlineDB;
  } catch (error) {
    console.error('Failed to initialize offline database:', error);
    return null;
  }
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Generate unique offline ID
function generateOfflineId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Store data for offline sync
export async function storeOfflineData(
  type: 'transaction' | 'pendingPayment' | 'meterReading' | 'note',
  data: any
): Promise<string> {
  try {
    if (!offlineDB) {
      const db = await initOfflineDB();
      if (!db) throw new Error('Failed to initialize database');
    }
    
    const record: OfflineRecord = {
      id: generateOfflineId(),
      type,
      data,
      synced: false,
      timestamp: Date.now(),
      retries: 0
    };
    
    await offlineDB.add('offlineData', record);
    return record.id;
  } catch (error) {
    console.error('Error storing offline data:', error);
    throw error;
  }
}

// Get unsynced data
export async function getUnsyncedData(): Promise<OfflineRecord[]> {
  try {
    if (!offlineDB) {
      const db = await initOfflineDB();
      if (!db) return [];
    }
    
    const tx = offlineDB.transaction('offlineData', 'readonly');
    const store = tx.objectStore('offlineData');
    const allRecords = await store.getAll();
    
    // Filter for unsynced records
    return allRecords.filter((record: OfflineRecord) => !record.synced);
  } catch (error) {
    console.error('Error getting unsynced data:', error);
    return [];
  }
}

// Mark record as synced
async function markAsSynced(id: string): Promise<void> {
  try {
    if (!offlineDB) {
      const db = await initOfflineDB();
      if (!db) return;
    }
    
    const tx = offlineDB.transaction('offlineData', 'readwrite');
    const store = tx.objectStore('offlineData');
    
    const record = await store.get(id);
    if (record) {
      record.synced = true;
      await store.put(record);
    }
  } catch (error) {
    console.error('Error marking record as synced:', error);
  }
}

// Remove synced record
async function removeSyncedRecord(id: string): Promise<void> {
  try {
    if (!offlineDB) {
      const db = await initOfflineDB();
      if (!db) return;
    }
    await offlineDB.delete('offlineData', id);
  } catch (error) {
    console.error('Error removing synced record:', error);
  }
}

// Sync data to Firebase
export async function syncToFirebase(): Promise<{ success: number; failed: number }> {
  if (!isOnline()) {
    return { success: 0, failed: 0 };
  }
  
  const unsyncedData = await getUnsyncedData();
  let success = 0;
  let failed = 0;
  
  for (const record of unsyncedData) {
    try {
      const collectionName = getFirebaseCollectionName(record.type);
      await addDoc(collection(db, collectionName), record.data);
      
      await removeSyncedRecord(record.id);
      success++;
    } catch (error) {
      console.error('Sync failed for record:', record.id, error);
      
      // Increment retry count
      record.retries = (record.retries || 0) + 1;
      
      if (record.retries >= 3) {
        await removeSyncedRecord(record.id);
        failed++;
      } else {
        // Update retry count
        const tx = offlineDB.transaction('offlineData', 'readwrite');
        await tx.objectStore('offlineData').put(record);
      }
    }
  }
  
  return { success, failed };
}

// Get pending sync count
export async function getPendingSyncCount(): Promise<number> {
  try {
    if (!offlineDB) await initOfflineDB();
    
    const unsyncedData = await getUnsyncedData();
    return unsyncedData.length;
  } catch (error) {
    console.error('Error getting pending sync count:', error);
    return 0;
  }
}

// Helper function to get Firebase collection name
function getFirebaseCollectionName(type: string): string {
  const mapping: Record<string, string> = {
    'transaction': 'transactions',
    'pendingPayment': 'pendingPayments',
    'meterReading': 'meterReadings',
    'note': 'notes'
  };
  return mapping[type] || type;
}

// Auto-sync setup
export function setupAutoSync(): void {
  // Initialize database
  initOfflineDB();
  
  // Sync when coming online
  window.addEventListener('online', async () => {
    console.log('Connection restored, syncing data...');
    const result = await syncToFirebase();
    if (result.success > 0) {
      console.log(`Synced ${result.success} items successfully`);
    }
    if (result.failed > 0) {
      console.log(`Failed to sync ${result.failed} items`);
    }
  });
  
  // Periodic sync when online (every 30 seconds)
  setInterval(async () => {
    if (isOnline()) {
      await syncToFirebase();
    }
  }, 30000);
  
  // Initial sync
  if (isOnline()) {
    syncToFirebase();
  }
}