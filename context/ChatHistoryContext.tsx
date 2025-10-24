import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { ChatMessage, Conversation } from '../types';
import { AuthContext } from './AuthContext';
import { generateConversationTitle } from '../services/geminiService';
import { createDemoConversations } from '../services/demoData';

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
  const supabaseClient = supabase;

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    if (!supabaseClient) {
      const demoConversations = createDemoConversations();
      setConversations(demoConversations);
      if (!activeConversationId && demoConversations.length > 0) {
        setActiveConversationId(demoConversations[0].id);
      }
      return;
    }

    try {
      const { data: conversationsData, error } = await supabaseClient
        .from('conversations')
        .select(`
          *,
          messages:chat_messages(*)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (conversationsData) {
        const formattedConversations: Conversation[] = conversationsData.map((conv: any) => ({
          id: conv.id,
          title: conv.title,
          timestamp: new Date(conv.updated_at).getTime(),
          messages: conv.messages?.map((msg: any) => ({
            id: msg.id,
            text: msg.text,
            sender: msg.sender as 'user' | 'ai',
            recommendations: msg.recommendations || [],
            sources: msg.sources || [],
            isLoading: false,
          })).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || [],
        }));

        setConversations(formattedConversations);

        if (!activeConversationId && formattedConversations.length > 0) {
          setActiveConversationId(formattedConversations[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [user, activeConversationId, supabaseClient]);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setActiveConversationId(null);
      return;
    }

    if (!supabaseClient) {
      fetchConversations();
      return;
    }

    fetchConversations();

    const channel: RealtimeChannel = supabaseClient
      .channel('conversations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `user_id=eq.${user.id}` }, () => {
        fetchConversations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [user, fetchConversations, supabaseClient]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const startNewConversation = async () => {
    if (!user) return;

    if (activeConversation && activeConversation.messages.length > 1) {
      if (!supabaseClient) {
        const updatedTitle = await generateConversationTitle(activeConversation.messages);
        setConversations(prev => prev.map(conv => (conv.id === activeConversation.id ? { ...conv, title: updatedTitle } : conv)));
      } else {
        setIsGeneratingTitle(true);
        try {
          const title = await generateConversationTitle(activeConversation.messages);

          await supabaseClient
            .from('conversations')
            .update({ title })
            .eq('id', activeConversation.id);

          await fetchConversations();
        } catch (e) {
          console.error("Failed to set title", e);
        } finally {
          setIsGeneratingTitle(false);
        }
      }
    }

    const newConv = createNewConversation();

    if (!supabaseClient) {
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from('conversations')
        .insert({
          user_id: user.id,
          title: newConv.title,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        await supabaseClient
          .from('chat_messages')
          .insert({
            conversation_id: data.id,
            sender: 'ai',
            text: newConv.messages[0].text,
          });

        setActiveConversationId(data.id);
        await fetchConversations();
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const setActiveConversation = async (conversationId: string) => {
    const convExists = conversations.find(c => c.id === conversationId);

    if (!convExists) {
      await startNewConversation();
    } else {
      setActiveConversationId(conversationId);
    }
  };

  const updateActiveConversationMessages = useCallback(async (updater: (prevMessages: ChatMessage[]) => ChatMessage[]) => {
    if (!activeConversationId || !user) return;

    const currentConv = conversations.find(c => c.id === activeConversationId);
    if (!currentConv) return;

    const updatedMessages = updater(currentConv.messages);
    const newMessages = updatedMessages.filter(msg =>
      !currentConv.messages.some(existingMsg => existingMsg.id === msg.id)
    );

    if (!supabaseClient) {
      setConversations(prev =>
        prev.map(conv =>
          conv.id === activeConversationId
            ? { ...conv, messages: updatedMessages }
            : conv
        )
      );
      return;
    }

    try {
      for (const msg of newMessages) {
        if (msg.id.startsWith('temp_') || !msg.isLoading) {
          await supabaseClient
            .from('chat_messages')
            .insert({
              conversation_id: activeConversationId,
              sender: msg.sender,
              text: msg.text || '',
              recommendations: msg.recommendations || [],
              sources: msg.sources || [],
            });
        }
      }

      await supabaseClient
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeConversationId);

      await fetchConversations();
    } catch (error) {
      console.error('Error updating messages:', error);
    }
  }, [activeConversationId, conversations, user, fetchConversations]);

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
