import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useSocketStore } from '../store/socketStore';

function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const token = useAuthStore((state) => state.token);
  const socket = useSocketStore((state) => state.socket);
  const { notifications, unreadCount, fetchNotifications, markAllAsRead } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(token);
  }, [token, fetchNotifications]);

  // Real-time listener
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      useNotificationStore.setState((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1
      }));
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket]);

  const handleOpen = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      markAllAsRead(token);
    }
  };

  const notificationContent = (
    <div 
      className="fixed inset-0 md:absolute md:top-full md:left-0 md:bottom-auto md:right-auto w-screen h-[100dvh] md:w-80 md:h-auto bg-white md:rounded-3xl shadow-2xl border border-gray-100 z-[999] flex flex-col text-right animate-fade-in overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
        <h4 className="font-bold text-gov-secondary">التنبيهات</h4>
        <div className="flex gap-4 items-center">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest">الأخيرة</span>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-400 p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        {notifications.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">لا توجد إشعارات حالياً</div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-gov-primary/5' : ''}`}>
              <p className="text-sm font-bold text-gov-secondary mb-1">{n.title}</p>
              <p className="text-xs text-gray-500 mb-2">{n.message}</p>
              <p className="text-[10px] text-gray-300">{new Date(n.createdAt).toLocaleString('ar-SY')}</p>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t md:hidden shrink-0">
        <button onClick={() => setIsOpen(false)} className="w-full py-3 bg-gov-secondary text-gov-primary rounded-xl font-bold active:scale-95 transition-transform">إغلاق</button>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button 
        onClick={handleOpen}
        className="relative p-2 text-gov-primary hover:bg-white/10 rounded-full transition-all"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-500 border-2 border-white md:border-gov-secondary pointer-events-none"></span>
        )}
      </button>

      {isOpen && (
        window.innerWidth < 768 
          ? createPortal(notificationContent, document.body)
          : notificationContent
      )}
    </div>
  );
}

export default NotificationBell;
