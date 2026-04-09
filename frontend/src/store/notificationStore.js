import { create } from 'zustand';
import axios from 'axios';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async (token) => {
    if (!token) return;
    set({ loading: true });
    try {
      const response = await axios.get('http://localhost:5000/api/citizen/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const unread = response.data.filter(n => !n.isRead).length;
      set({ notifications: response.data, unreadCount: unread, loading: false });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      set({ loading: false });
    }
  },

  markAllAsRead: async (token) => {
    try {
      await axios.put('http://localhost:5000/api/citizen/notifications/read', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ unreadCount: 0 });
      // Update local state to reflect read
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true }))
      }));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }
}));
