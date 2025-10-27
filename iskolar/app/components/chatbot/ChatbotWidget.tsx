'use client';

import React, { useState, useEffect } from 'react';
import { ChatWindow } from './ChatWindow';
import { InputForm } from './InputForm';
import type { Message } from './types';
import { Role } from './types';
import { supabase } from '@/lib/supabaseClient';
import { extractPageContext } from './pageContext';

export const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: Role.BOT,
      content: "Hey there! 👋 I'm ISKAi, your friendly guide to everything IskoLAR! Whether you need help with applications, want to check your status, or just have questions about the system, I've got your back. What can I help you with today?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Show help bubble after 2 seconds, hide after 10 seconds or when opened
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setShowBubble(true);
    }, 2000);

    const hideTimer = setTimeout(() => {
      setShowBubble(false);
    }, 12000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleOpenChat = () => {
    setIsOpen(true);
    setShowBubble(false);
  };

  const handleSendMessage = async (query: string) => {
    const userMessage: Message = { role: Role.USER, content: query };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Extract current page context
      const pageContext = extractPageContext();
      console.log('[ISKAi] Page context:', pageContext);

      // Get the session token for authenticated requests
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Add Authorization header if user is logged in
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          messages: newMessages,
          query,
          pageContext // Send page context to AI
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('[ISKAi] API error:', response.status, data);
        throw new Error(data.error || 'Failed to get response from chatbot');
      }

      const botMessage: Message = { 
        role: Role.BOT, 
        content: data.message 
      };

      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('[ISKAi] Failed to get bot response:', error);
      
      let errorText = 'Sorry, something went wrong. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorText = "I'm having trouble connecting to my AI service. Please contact support.";
        } else if (error.message.includes('timeout')) {
          errorText = "I'm taking too long to respond. Please try again!";
        }
      }
      
      const errorMessage: Message = {
        role: Role.BOT,
        content: errorText,
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Help Bubble */}
      {!isOpen && showBubble && (
        <div className="fixed bottom-28 right-8 z-50 animate-slideInBounce">
          <div className="relative bg-white rounded-2xl shadow-xl p-4 max-w-xs border border-gray-200">
            <button
              onClick={() => setShowBubble(false)}
              className="absolute -top-2 -right-2 bg-gray-200 hover:bg-gray-300 rounded-full p-1 transition-colors"
              aria-label="Close bubble"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-red-500 to-blue-600 rounded-full flex items-center justify-center shadow-md animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 22.5l-.394-1.933a2.25 2.25 0 00-1.423-1.423L12.75 18.75l1.933-.394a2.25 2.25 0 001.423-1.423l.394-1.933.394 1.933a2.25 2.25 0 001.423 1.423l1.933.394-1.933.394a2.25 2.25 0 00-1.423 1.423z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 mb-1">Need help?</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Hi! I&apos;m ISKAi. Ask me anything about scholarships, applications, or your account! 👋
                </p>
              </div>
            </div>
            {/* Pointer/Tail */}
            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-r border-b border-gray-200 transform rotate-45"></div>
          </div>
        </div>
      )}

      {/* Chat Widget Button */}
      {!isOpen && (
        <button
          onClick={handleOpenChat}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-700 hover:to-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 group border border-red-400"
          aria-label="Open chatbot"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className="w-7 h-7 group-hover:scale-110 transition-transform duration-300"
          >
            {/* AI Sparkle Icon */}
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 22.5l-.394-1.933a2.25 2.25 0 00-1.423-1.423L12.75 18.75l1.933-.394a2.25 2.25 0 001.423-1.423l.394-1.933.394 1.933a2.25 2.25 0 001.423 1.423l1.933.394-1.933.394a2.25 2.25 0 00-1.423 1.423z"/>
          </svg>
          <span className="font-semibold text-base">ISKAi</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] h-[650px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-6 h-6"
                >
                  {/* AI Sparkle Icon */}
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 22.5l-.394-1.933a2.25 2.25 0 00-1.423-1.423L12.75 18.75l1.933-.394a2.25 2.25 0 001.423-1.423l.394-1.933.394 1.933a2.25 2.25 0 001.423 1.423l1.933.394-1.933.394a2.25 2.25 0 00-1.423 1.423z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">ISKAi</h2>
                <p className="text-xs text-red-100 font-medium">IskoLAR Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-full p-2 transition-all duration-200 group"
              aria-label="Close chatbot"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300"
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
