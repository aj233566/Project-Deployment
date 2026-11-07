class NotificationService {
  isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
  }
  getPermission() {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }
  async requestPermission() {
    if (!this.isSupported()) {
      return { supported: false, permission: 'denied' };
    }
    try {
      const permission = await Notification.requestPermission();
      return { supported: true, permission };
    } catch (err) {
      console.warn('Browser notification permission request failed:', err);
      return { supported: true, permission: Notification.permission };
    }
  }
  sendBrowserNotification(title, options = {}) {
    if (!this.isSupported()) {
      return false;
    }
    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          body: options.body || '',
          tag: options.tag || 'cascade-alert',
          renotify: true,
          requireInteraction: options.requireInteraction || false,
          ...options
        });
        notif.onclick = () => {
          window.focus();
          if (options.onClick) options.onClick();
        };
        this.playBeepSound();
        return true;
      } catch (err) {
        console.error('Error creating browser notification:', err);
        return false;
      }
    }
    return false;
  }
  playBeepSound() {
    try {
      if (typeof window === 'undefined') return;
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch { void 0; }
  }
}
export const notificationService = new NotificationService();
