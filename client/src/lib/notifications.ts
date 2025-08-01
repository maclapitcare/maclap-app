// Notification management system
class NotificationManager {
  private permission: NotificationPermission = 'default';
  private reminderTimeouts: Map<string, number> = new Map();

  constructor() {
    this.init();
  }

  private async init() {
    // Check if notifications are supported
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    
    return permission === 'granted';
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  async showNotification(title: string, options: NotificationOptions = {}) {
    if (this.permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    const defaultOptions: NotificationOptions = {
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      requireInteraction: true,
      tag: 'maclap-reminder',
      ...options
    };

    // Use regular notification
    new Notification(title, defaultOptions);
  }

  async scheduleDailyReminder(username: string) {
    // Check if we have permission
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      return false;
    }

    // Set up daily reminder at 10:30 PM
    this.setupDailyReminderTimer(username);
    return true;
  }

  private setupDailyReminderTimer(username: string) {
    // Clear existing timeout for this user
    const existingTimeout = this.reminderTimeouts.get(username);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(22, 30, 0, 0); // 10:30 PM

    // If it's already past 10:30 PM today, schedule for tomorrow
    if (now > targetTime) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    const timeUntilReminder = targetTime.getTime() - now.getTime();

    const timeoutId = window.setTimeout(async () => {
      await this.showDailyReminder(username);
      // Schedule the next reminder for tomorrow
      this.setupDailyReminderTimer(username);
    }, timeUntilReminder);

    this.reminderTimeouts.set(username, timeoutId);
    console.log(`Daily reminder scheduled for ${username} at ${targetTime.toLocaleString()}`);
  }

  private async showDailyReminder(username: string) {
    const title = `MacLap Daily Reminder - ${username}`;
    const body = `Hi ${username}! Don't forget to add your daily transactions for today.`;
    
    await this.showNotification(title, {
      body,
      requireInteraction: true
    });
  }

  stopDailyReminder(username: string) {
    const timeoutId = this.reminderTimeouts.get(username);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      this.reminderTimeouts.delete(username);
      console.log(`Daily reminder stopped for ${username}`);
    }
  }

  async testNotification(username: string) {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      return false;
    }

    await this.showNotification(`Test Notification - ${username}`, {
      body: 'This is a test notification to verify the system is working!',
      requireInteraction: false
    });
    
    return true;
  }

  // Check if user has today's transactions
  private async checkTodayTransactions(username: string): Promise<boolean> {
    try {
      // Import Firebase here to avoid circular dependencies
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      
      const today = new Date().toISOString().split('T')[0];
      
      const q = query(
        collection(db, 'transactions'),
        where('user', '==', username),
        where('date', '==', today)
      );
      
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking today transactions:', error);
      return false;
    }
  }

  async showSmartReminder(username: string) {
    const hasTransactions = await this.checkTodayTransactions(username);
    
    if (hasTransactions) {
      // User has transactions, show gentle reminder
      await this.showNotification(`Good work, ${username}!`, {
        body: 'You have transactions for today. Don\'t forget to add any remaining entries.',
        requireInteraction: false
      });
    } else {
      // No transactions, show urgent reminder
      await this.showNotification(`Important: ${username}`, {
        body: 'No transactions recorded for today! Please add your daily entries.',
        requireInteraction: true,

      });
    }
  }
}

export const notificationManager = new NotificationManager();