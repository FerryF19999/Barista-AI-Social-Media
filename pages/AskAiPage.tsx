


import React, { useState, useRef, useEffect, useContext } from 'react';
import { ChatHistoryContext } from '../context/ChatHistoryContext';
import Header from '../components/Header';
import ChatMessage from '../components/ChatMessage';
import { PaperAirplaneIcon, PencilSquareIcon } from '../components/Icons';
import { streamAIBaristaResponse } from '../services/geminiService';

const AskAiPage: React.FC = () => {
    const chatContext = useContext(ChatHistoryContext);
    const [userInput, setUserInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const activeConversation = chatContext?.activeConversation;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [activeConversation]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [userInput]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedInput = userInput.trim();
        if (!trimmedInput || isThinking || !chatContext) return;

        const { updateActiveConversationMessages } = chatContext;
        const userMessageId = `user_${Date.now()}`;
        const aiMessageId = `ai_${Date.now()}`;

        // Add user message
        updateActiveConversationMessages(prev => [
            ...prev,
            { id: userMessageId, text: trimmedInput, sender: 'user' }
        ]);
        
        setUserInput('');
        setIsThinking(true);

        // Add initial AI thinking message
        updateActiveConversationMessages(prev => [
            ...prev,
            { id: aiMessageId, sender: 'ai', isLoading: true, text: '', recommendations: [], sources: [] }
        ]);

        try {
            const stream = streamAIBaristaResponse(trimmedInput);
            let firstChunk = true;

            for await (const chunk of stream) {
                 updateActiveConversationMessages(prev =>
                    prev.map(msg => {
                        if (msg.id === aiMessageId) {
                            const newText = (msg.text || '') + (chunk.text || '');
                            const newRecommendations = [...(msg.recommendations || []), ...(chunk.recommendations || [])];
                            const newSources = [...(msg.sources || []), ...(chunk.sources || [])];
                            if (firstChunk) {
                                firstChunk = false;
                                return { ...msg, text: newText, recommendations: newRecommendations, sources: newSources, isLoading: false };
                            }
                            return { ...msg, text: newText, recommendations: newRecommendations, sources: newSources };
                        }
                        return msg;
                    })
                );
            }
        } catch (error) {
            console.error('Error streaming AI response:', error);
            updateActiveConversationMessages(prev =>
                prev.map(msg =>
                    msg.id === aiMessageId
                        ? { ...msg, text: 'Maaf, terjadi kesalahan. Coba lagi nanti.', isLoading: false }
                        : msg
                )
            );
        } finally {
            setIsThinking(false);
        }
    };
    
    if (!chatContext) return null;

    return (
        <div className="flex flex-col h-screen bg-stone-50">
            <Header
                title="Ask AI Barista"
                action={
                    <button 
                        onClick={() => chatContext.startNewConversation()} 
                        disabled={chatContext.isGeneratingTitle}
                        className="p-1.5 rounded-full hover:bg-stone-100 transition-colors disabled:opacity-50"
                        aria-label="New Chat"
                    >
                       <PencilSquareIcon className="w-6 h-6 text-stone-600" />
                    </button>
                }
            />
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeConversation?.messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                ))}
                 <div ref={messagesEndRef} />
            </main>
            <footer className="bg-white p-3 border-t border-stone-200">
                <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
                    <textarea
                        ref={textareaRef}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Tanya soal kopi..."
                        className="flex-grow p-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none max-h-32 hide-scrollbar"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                        disabled={isThinking}
                    />
                    <button
                        type="submit"
                        disabled={!userInput.trim() || isThinking}
                        className="p-3 bg-amber-700 text-white rounded-full transition-colors duration-200 hover:bg-amber-600 disabled:bg-stone-300 disabled:cursor-not-allowed"
                        aria-label="Send message"
                    >
                        <PaperAirplaneIcon className="w-6 h-6" />
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default AskAiPage;