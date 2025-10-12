import React, { useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ChatHistoryProvider } from './context/ChatHistoryContext';
import { PostProvider } from './context/PostContext';

import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import FeedPage from './pages/FeedPage';
import AskAiPage from './pages/AskAiPage';
import ChatHistoryPage from './pages/ChatHistoryPage';
import ProfilePage from './pages/ProfilePage';
import AddPostPage from './pages/AddPostPage';
import AiAnalysisPage from './pages/AiAnalysisPage';
import BottomNav from './components/BottomNav';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ChatHistoryProvider>
        <PostProvider>
          <HashRouter>
            <Main />
          </HashRouter>
        </PostProvider>
      </ChatHistoryProvider>
    </AuthProvider>
  );
};

const Main: React.FC = () => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    return null; // or a loading spinner
  }
  const { user, loading } = authContext;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-100">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-amber-800"></div>
      </div>
    );
  }

  // Unauthenticated users see public pages without the main app shell
  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    );
  }

  // Authenticated users see private pages within the main app shell
  return (
    <div className="max-w-md mx-auto min-h-screen font-sans bg-white shadow-lg">
      <div className="pb-20">
        <Routes>
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/ask-ai" element={<AskAiPage />} />
          <Route path="/history" element={<ChatHistoryPage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/add-post" element={<AddPostPage />} />
          <Route path="/analysis" element={<AiAnalysisPage />} />
          <Route path="*" element={<Navigate to="/feed" />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  );
};

export default App;