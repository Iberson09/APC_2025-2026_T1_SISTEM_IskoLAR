'use client';

import React, { useState } from 'react';
import { ChatWindow } from './ChatWindow';
import { InputForm } from './InputForm';
import type { Message } from './types';
import { Role } from './types';

export const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: Role.BOT,
      content: "Hello there! I'm ISKAi, your friendly assistant for the IskoLAR system. I'm here to help you with any questions you have. How can I assist you today?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (query: string) => {
    const userMessage: Message = { role: Role.USER, content: query };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: newMessages,
          query 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from chatbot');
      }

      const data = await response.json();
      const botMessage: Message = { 
        role: Role.BOT, 
        content: data.message 
      };

      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('Failed to get bot response:', error);
      const errorMessage: Message = {
        role: Role.BOT,
        content: 'Sorry, something went wrong. Please try again.',
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Widget Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-2xl transition-all duration-200 flex items-center gap-2"
          aria-label="Open chatbot"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className="w-6 h-6"
          >
            <path 
              fillRule="evenodd" 
              d="M4.5 3.75a3 3 0 00-3 3v10.5a3 3 0 003 3h15a3 3 0 003-3V6.75a3 3 0 00-3-3h-15zm4.125 3.375a.75.75 0 000 1.5h6.75a.75.75 0 000-1.5h-6.75zm0 3.75a.75.75 0 000 1.5h6.75a.75.75 0 000-1.5h-6.75zm0 3.75a.75.75 0 000 1.5h6.75a.75.75 0 000-1.5h-6.75z" 
              clipRule="evenodd" 
            />
          </svg>
          <span className="font-medium">ISKAi</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[600px] bg-slate-50 rounded-2xl shadow-2xl flex flex-col overflow-hidden border-4 border-white">
          {/* Header */}
          <div className="bg-blue-700 text-white p-4 flex items-center justify-between shadow-md">
            <div>
              <h2 className="text-lg font-bold">ISKAi - IskoLAR Assistant</h2>
              <p className="text-sm">Your guide to the scholarship portal</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-blue-600 rounded-full p-1 transition-colors"
              aria-label="Close chatbot"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className="w-6 h-6"
              >
                <path 
                  fillRule="evenodd" 
                  d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" 
                  clipRule="evenodd" 
                />
              </svg>
            </button>
          </div>

          {/* Chat Content */}
          <ChatWindow messages={messages} isLoading={isLoading} />
          <InputForm onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      )}
    </>
  );
};
