import React from 'react';
import { useAuthStore } from '../store/authStore';
import NotificationBell from './NotificationBell';

const MobileNav = ({ view, setView, setActiveCategory }) => {
  const { logout, user } = useAuthStore();

  if (!user || user.role === 'EMPLOYEE') return null;

  return (
    <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-gov-secondary border-2 border-gov-primary z-[100] px-6 py-3 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-center gap-8 min-w-[240px]">
        <button 
          onClick={() => {setView('DASHBOARD'); setActiveCategory(null);}}
          className={`transition-all ${view === 'DASHBOARD' ? 'text-gov-primary scale-125' : 'text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>

        <button 
          onClick={() => setView('REQUESTS')}
          className={`transition-all ${view === 'REQUESTS' ? 'text-gov-primary scale-125' : 'text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>

        <div className="flex items-center text-gray-400">
          <NotificationBell />
        </div>

        <button 
          onClick={logout}
          className="text-red-400 active:scale-90 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MobileNav;
