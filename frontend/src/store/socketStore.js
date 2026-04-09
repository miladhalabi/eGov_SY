import { create } from 'zustand';
import { io } from 'socket.io-client';

export const useSocketStore = create((set, get) => ({
  socket: null,

  connect: (token) => {
    if (get().socket) return;

    const socketInstance = io('http://localhost:5000', {
      auth: { token }
    });

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socketInstance.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message);
    });

    set({ socket: socketInstance });
  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  }
}));
