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
    <div className="flex-1 p-6 overflow-y-auto">
      {messages.map((msg, index) => (
        <ChatMessage key={index} message={msg} />
      ))}
      {isLoading && (
        <div className="flex justify-start items-center">
            <div className="text-slate-500 text-sm p-2">ISKAi is typing...</div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
