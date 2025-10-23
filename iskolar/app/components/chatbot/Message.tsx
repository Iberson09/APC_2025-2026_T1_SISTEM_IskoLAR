import React from 'react';
import type { Message } from './types';
import { Role } from './types';
import { BotIcon, UserIcon } from './Icons';

interface MessageProps {
  message: Message;
}

// A simple parser to render markdown bolding
const renderWithBold = (text: string) => {
  const parts = text.split('**');
  return parts.map((part, index) =>
    index % 2 === 1 ? <strong key={index}>{part}</strong> : part
  );
};

export const ChatMessage: React.FC<MessageProps> = ({ message }) => {
  const isBot = message.role === Role.BOT;

  const messageClasses = isBot
    ? 'bg-slate-700 text-white'
    : 'bg-blue-600 text-white';
  const containerClasses = isBot ? 'justify-start' : 'justify-end';
  const iconContainerClasses = isBot ? 'bg-slate-500' : 'bg-blue-500';

  return (
    <div className={`flex items-start gap-3 my-4 ${containerClasses}`}>
      {isBot && (
        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${iconContainerClasses}`}>
          <BotIcon />
        </div>
      )}
      <div
        className={`max-w-md md:max-w-lg p-4 rounded-2xl shadow-md ${messageClasses}`}
        style={{ whiteSpace: 'pre-wrap' }}
      >
        {renderWithBold(message.content)}
      </div>
       {!isBot && (
        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${iconContainerClasses}`}>
          <UserIcon />
        </div>
      )}
    </div>
  );
};
