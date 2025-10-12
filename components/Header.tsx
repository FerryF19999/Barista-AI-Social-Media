import React, { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  action?: ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, action }) => {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-white p-4 border-b border-stone-200">
      <h1 className="text-xl font-bold text-stone-800">{title}</h1>
      <div>
        {action}
      </div>
    </header>
  );
};

export default Header;
