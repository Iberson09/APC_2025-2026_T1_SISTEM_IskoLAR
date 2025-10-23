import React, { useRef, useEffect } from 'react';
import type { Message } from './types';
import { ChatMessage } from './Message';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="flex-1 px-5 py-4 overflow-y-auto bg-gradient-to-b from-gray-50 to-white">
      {messages.map((msg, index) => (
        <ChatMessage key={index} message={msg} />
      ))}
      {isLoading && (
        <div className="flex justify-start items-center my-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-2xl rounded-tl-sm shadow-lg">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm font-medium text-gray-200">ISKAi is typing...</span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
