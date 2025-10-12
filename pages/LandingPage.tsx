import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div 
      className="flex flex-col min-h-screen justify-between p-8 text-center overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #fffbf0 0%, #fdf6e3 100%)'
      }}
    >
      {/* Decorative shapes for background atmosphere */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-amber-100 rounded-full opacity-50 -translate-x-1/4 -translate-y-1/4 filter blur-2xl"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-orange-100 rounded-full opacity-50 translate-x-1/4 translate-y-1/4 filter blur-3xl"></div>
      
      {/* Spacer div to push content to the middle */}
      <div aria-hidden="true"></div>

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center">
        <svg width="150" height="150" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="mb-6">
            <g className="text-amber-800">
                <path d="M15 30 C 15 15, 85 15, 85 30 L 85 70 C 85 85, 15 85, 15 70 Z" fill="currentColor" />
                <path d="M85 40 C 95 40, 95 60, 85 60" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" />
            </g>
            <text x="50" y="58" fontFamily="sans-serif" fontSize="28" fontWeight="bold" fill="white" textAnchor="middle">AI</text>
            <g className="text-white" opacity="0.8">
                <path d="M30 15 Q 35 25, 40 15" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
                <path d="M50 12 Q 55 22, 60 12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
                <path d="M70 15 Q 75 25, 80 15" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
            </g>
        </svg>

        <h1 className="text-4xl font-bold text-amber-900 leading-tight mb-3">
          Teman Ngopi Cerdasmu
        </h1>
        <p className="text-stone-600 max-w-sm text-lg">
          Temukan kafe, biji kopi, dan resep yang sempurna dengan bantuan AI.
        </p>
      </main>

      {/* Action buttons */}
      <footer className="relative z-10 w-full max-w-sm mx-auto">
        <Link 
          to="/auth?mode=signup"
          className="block w-full bg-amber-700 text-white font-bold py-4 px-4 rounded-xl mb-4 text-center transition-all duration-300 transform hover:scale-105 hover:bg-amber-600 shadow-lg hover:shadow-xl"
        >
          Mulai Jelajah
        </Link>
        <p className="text-sm text-stone-500">
          Sudah punya akun?{' '}
          <Link 
            to="/auth?mode=login"
            className="font-bold text-amber-800 hover:underline"
          >
            Masuk di sini
          </Link>
        </p>
        <p className="text-xs text-stone-400 mt-8">
          Made in Indonesia
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;