import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { ChatHistoryContext } from '../context/ChatHistoryContext';

const ChatHistoryPage: React.FC = () => {
  const chatHistoryContext = useContext(ChatHistoryContext);
  const navigate = useNavigate();

  if (!chatHistoryContext) {
    throw new Error("ChatHistoryPage must be used within a ChatHistoryProvider");
  }

  const { conversations, setActiveConversation } = chatHistoryContext;
  const sortedConversations = [...conversations].sort((a, b) => b.timestamp - a.timestamp);

  const handleSelectConversation = (id: string) => {
    setActiveConversation(id);
    navigate('/ask-ai');
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <Header title="Riwayat Obrolan" />
      <main className="flex-grow overflow-y-auto">
        {sortedConversations.length === 0 ? (
          <div className="text-center py-20 px-4">
            <p className="text-stone-500">Belum ada riwayat obrolan.</p>
            <p className="text-sm text-stone-400 mt-2">Mulai percakapan di halaman Ask AI!</p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-200">
            {sortedConversations.map(conv => {
              const lastMessage = conv.messages[conv.messages.length - 1];
              const snippet = lastMessage?.text 
                  ? (lastMessage.text.length > 50 ? lastMessage.text.substring(0, 50) + '...' : lastMessage.text)
                  : 'Rekomendasi ditampilkan.';

              return (
                <li key={conv.id}>
                  <button 
                    onClick={() => handleSelectConversation(conv.id)} 
                    className="w-full text-left p-4 hover:bg-stone-50 transition-colors duration-150"
                  >
                    <h3 className="font-bold text-stone-800 text-md truncate">{conv.title}</h3>
                    <p className="text-sm text-stone-500 mt-1 truncate">
                      {lastMessage?.sender === 'user' ? 'Anda: ' : 'AI: '}
                      {snippet}
                    </p>
                    <time className="text-xs text-stone-400 mt-2 block">
                      {new Date(conv.timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
};

export default ChatHistoryPage;