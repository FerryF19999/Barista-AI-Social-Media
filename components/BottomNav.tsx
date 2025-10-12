import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, ChatBubbleLeftEllipsisIcon, ClockHistoryIcon, UserCircleIcon } from './Icons';
import { AuthContext } from '../context/AuthContext';

const BottomNav: React.FC = () => {
  const authContext = useContext(AuthContext);
  const commonClasses = "flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200";
  const activeClass = "text-amber-700";
  const inactiveClass = "text-stone-500 hover:text-amber-600";
  
  if (!authContext?.user) {
      return null;
  }
  const { user } = authContext;

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-16 bg-white border-t border-stone-200 shadow-t-lg">
      <div className="flex justify-around h-full">
        <NavLink to="/feed" className={({ isActive }) => `${commonClasses} ${isActive ? activeClass : inactiveClass}`}>
          <HomeIcon />
          <span className="text-xs font-medium">Feed</span>
        </NavLink>
        <NavLink to="/ask-ai" className={({ isActive }) => `${commonClasses} ${isActive ? activeClass : inactiveClass}`}>
          <ChatBubbleLeftEllipsisIcon />
          <span className="text-xs font-medium">Ask AI</span>
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `${commonClasses} ${isActive ? activeClass : inactiveClass}`}>
          <ClockHistoryIcon />
          <span className="text-xs font-medium">Riwayat</span>
        </NavLink>
        <NavLink to={`/profile/${user.id}`} className={({ isActive }) => `${commonClasses} ${isActive ? activeClass : inactiveClass}`}>
          <UserCircleIcon />
          <span className="text-xs font-medium">Profile</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNav;