

import React from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { AiIcon } from './Icons';
import RecommendationCard from './RecommendationCard';

interface ChatMessageProps {
    message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    const isUser = message.sender === 'user';

    if (isUser) {
        return (
            <div className="flex justify-end">
                <div className="bg-amber-700 text-white p-3 rounded-xl max-w-sm rounded-br-none">
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                </div>
            </div>
        );
    }

    // AI Message
    return (
        <div className="flex items-start space-x-3">
            <AiIcon />
            <div className="flex-1">
                {message.isLoading ? (
                     <div className="bg-stone-200 p-3 rounded-xl max-w-sm rounded-bl-none inline-block">
                        <div className="flex items-center space-x-2">
                           <div className="w-2 h-2 bg-stone-500 rounded-full animate-pulse"></div>
                           <div className="w-2 h-2 bg-stone-500 rounded-full animate-pulse delay-150"></div>
                           <div className="w-2 h-2 bg-stone-500 rounded-full animate-pulse delay-300"></div>
                        </div>
                    </div>
                ) : (
                    <>
                        {message.text && (
                            <div className="bg-stone-200 text-stone-800 p-3 rounded-xl max-w-sm rounded-bl-none mb-3">
                                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                            </div>
                        )}
                        {message.sources && message.sources.length > 0 && (
                             <div className="bg-stone-100 border border-stone-200 text-stone-600 p-3 rounded-xl max-w-sm rounded-bl-none mb-3">
                                <h4 className="text-xs font-bold text-stone-700 mb-2">Sumber Informasi:</h4>
                                <ul className="space-y-1.5">
                                    {message.sources.map((source, index) => (
                                        <li key={index}>
                                            <a 
                                                href={source.uri}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-amber-800 hover:underline truncate block"
                                            >
                                                {source.title || source.uri}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {message.recommendations && message.recommendations.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {message.recommendations.map((shop, index) => (
                                    <RecommendationCard key={`${shop.name}-${index}`} shop={shop} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ChatMessage;