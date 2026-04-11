import { create } from 'zustand';

export const useTrafficStore = create((set) => ({
  activeOffer: null,
  setActiveOffer: (offer) => set({ activeOffer: offer }),
  clearActiveOffer: () => set({ activeOffer: null }),
}));
