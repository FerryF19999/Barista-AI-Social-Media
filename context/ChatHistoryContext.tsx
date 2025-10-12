import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { ChatMessage, Conversation } from '../types';
import { AuthContext } from './AuthContext';
import { generateConversationTitle } from '../services/geminiService';

interface ChatHistoryContextType {
  conversations: Conversation[];
  activeConversation: Conversation | undefined;
  startNewConversation: () => Promise<void>;
  setActiveConversation: (conversationId: string) => void;
  updateActiveConversationMessages: (updater: (prevMessages: ChatMessage[]) => ChatMessage[]) => void;
  isGeneratingTitle: boolean;
}

export const ChatHistoryContext = createContext<ChatHistoryContextType | undefined>(undefined);

const createNewConversation = (): Conversation => {
    const newId = `conv_${Date.now()}`;
    return {
        id: newId,
        title: "Obrolan Baru",
        timestamp: Date.now(),
        messages: [{ 
            id: 'welcome_msg', 
            text: 'Halo! Saya AI Barista. Tanyakan apa saja, misalnya "carikan tempat kopi untuk kerja fokus di dekatku".', 
            sender: 'ai' 
        }]
    };
};

export const ChatHistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const authContext = useContext(AuthContext);
  const user = authContext?.user;

  // Load state from localStorage on mount
  useEffect(() => {
    if (user) {
      try {
        const storedConvos = localStorage.getItem(`conversations-${user.id}`);
        const storedActiveId = localStorage.getItem(`activeConversationId-${user.id}`);
        
        if (storedConvos) {
          setConversations(JSON.parse(storedConvos));
          setActiveConversationId(storedActiveId || null);
        } else {
          // If no history, start fresh
          const newConv = createNewConversation();
          setConversations([newConv]);
          setActiveConversationId(newConv.id);
        }
      } catch (error) {
        console.error("Failed to parse from localStorage", error);
        const newConv = createNewConversation();
        setConversations([newConv]);
        setActiveConversationId(newConv.id);
      }
    } else {
      // Clear state on logout
      setConversations([]);
      setActiveConversationId(null);
    }
  }, [user]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (user && conversations.length > 0) {
      localStorage.setItem(`conversations-${user.id}`, JSON.stringify(conversations));
      if (activeConversationId) {
        localStorage.setItem(`activeConversationId-${user.id}`, activeConversationId);
      }
    }
  }, [conversations, activeConversationId, user]);
  
  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const startNewConversation = async () => {
    if (!activeConversation) return;

    // Archive the current conversation if it has user interaction
    if (activeConversation.messages.length > 1) {
      setIsGeneratingTitle(true);
      try {
        const title = await generateConversationTitle(activeConversation.messages);
        setConversations(prev => prev.map(c => 
          c.id === activeConversation.id ? { ...c, title, timestamp: Date.now() } : c
        ));
      } catch(e) {
        console.error("Failed to set title", e);
      } finally {
        setIsGeneratingTitle(false);
      }
    }
    
    // Create and set the new conversation as active
    const newConv = createNewConversation();
    // Add new conv, and filter out the old "new" one if it was never used
    setConversations(prev => [newConv, ...prev.filter(c => c.messages.length > 1)]);
    setActiveConversationId(newConv.id);
  };

  const setActiveConversation = (conversationId: string) => {
    // If the selected convo doesn't exist, create a new one.
    if (!conversations.find(c => c.id === conversationId)) {
        const newConv = createNewConversation();
        setConversations(prev => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
    } else {
        setActiveConversationId(conversationId);
    }
  };

  const updateActiveConversationMessages = (updater: (prevMessages: ChatMessage[]) => ChatMessage[]) => {
    if (!activeConversationId) return;
    setConversations(prevConvs => 
        prevConvs.map(c => {
            if (c.id === activeConversationId) {
                return { ...c, messages: updater(c.messages || []), timestamp: Date.now() };
            }
            return c;
        })
    );
  };

  return (
    <ChatHistoryContext.Provider value={{
        conversations: conversations.filter(c => c.id !== activeConversationId || c.messages.length > 1),
        activeConversation,
        startNewConversation,
        setActiveConversation,
        updateActiveConversationMessages,
        isGeneratingTitle,
    }}>
      {children}
    </ChatHistoryContext.Provider>
  );
};