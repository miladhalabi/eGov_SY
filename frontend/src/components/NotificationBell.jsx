import { useState, useEffect } from 'react';
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
  }, [token]);

  // Real-time listener
  useEffect(() => {
    if (!socket) return;

    socket.on('new_notification', (notification) => {
      // Use set state directly via store
      useNotificationStore.setState((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1
      }));
    });

    return () => {
      socket.off('new_notification');
    };
  }, [socket]);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      markAllAsRead(token);
    }
  };

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
          <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 border-2 border-gov-secondary text-[10px] flex items-center justify-center font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[100] overflow-hidden text-right">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h4 className="font-bold text-gov-secondary">التنبيهات</h4>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest">الأخيرة</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
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
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
