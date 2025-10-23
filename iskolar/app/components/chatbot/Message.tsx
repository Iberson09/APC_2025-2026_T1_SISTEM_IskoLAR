import React from 'react';
import type { Message } from './types';
import { Role } from './types';
import { BotIcon, UserIcon } from './Icons';

interface MessageProps {
  message: Message;
}

// Enhanced parser to render markdown with proper formatting and spacing
const renderFormattedText = (text: string) => {
  // First, normalize inline numbered/bulleted lists by adding line breaks
  const normalizedText = text
    // Add line break before numbered items (1. 2. 3. etc)
    .replace(/(\d+\.\s)/g, '\n$1')
    // Add line break before numbered items with parenthesis (1) 2) 3) etc)
    .replace(/(\d+\)\s)/g, '\n$1')
    // Clean up any double line breaks at the start
    .replace(/^\n+/, '');
  
  // Split into paragraphs (double newlines or Q: patterns)
  const paragraphs = normalizedText.split(/\n\n+|(?=Q:)/g).filter(p => p.trim());
  
  return paragraphs.map((paragraph, pIndex) => {
    const trimmedParagraph = paragraph.trim();
    
    // Check if this is a Q&A pattern
    const isQuestion = trimmedParagraph.startsWith('Q:');
    const isAnswer = trimmedParagraph.startsWith('A:');
    
    // Split into lines
    const lines = trimmedParagraph.split('\n');
    
    // Check if paragraph contains numbered or bulleted lists
    const hasListItems = lines.some(line => 
      /^\d+\./.test(line.trim()) || // Numbered list (1. 2. 3.)
      /^[-•*]\s/.test(line.trim()) ||  // Bullet points (- • *)
      /^\d+\)/.test(line.trim())     // Numbered with parenthesis (1) 2) 3))
    );
    
    if (hasListItems) {
      // Render as a list with proper line breaks
      return (
        <div key={pIndex} className={`${pIndex > 0 ? 'mt-3' : ''}`}>
          {lines.map((line, lineIndex) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return null;
            
            const isListItem = /^\d+\./.test(trimmedLine) || 
                              /^[-•*]\s/.test(trimmedLine) || 
                              /^\d+\)/.test(trimmedLine);
            
            // Split by bold markers while preserving them
            const parts = trimmedLine.split(/(\*\*.*?\*\*)/g);
            const formattedContent = parts.map((part, index) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                const boldText = part.slice(2, -2);
                return (
                  <strong key={`${pIndex}-${lineIndex}-${index}`} className="font-bold text-blue-100">
                    {boldText}
                  </strong>
                );
              }
              return part;
            });
            
            return (
              <div 
                key={`${pIndex}-${lineIndex}`} 
                className={`${isListItem ? 'ml-1 mt-2' : ''} ${lineIndex > 0 && !isListItem ? 'mt-1' : ''}`}
              >
                {formattedContent}
              </div>
            );
          })}
        </div>
      );
    }
    
    // Regular paragraph handling (no lists)
    // Split by bold markers while preserving them
    const parts = trimmedParagraph.split(/(\*\*.*?\*\*)/g);
    
    const formattedContent = parts.map((part, index) => {
      // Check if this part is bold (wrapped in **)
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return (
          <strong key={`${pIndex}-${index}`} className="font-bold text-blue-100">
            {boldText}
          </strong>
        );
      }
      // Regular text - split by single newlines for proper line breaks
      return part.split('\n').map((line, lineIndex, array) => (
        <React.Fragment key={`${pIndex}-${index}-${lineIndex}`}>
          {line}
          {lineIndex < array.length - 1 && <br />}
        </React.Fragment>
      ));
    });

    // Render with appropriate spacing
    return (
      <div 
        key={pIndex} 
        className={`${pIndex > 0 ? 'mt-3' : ''} ${isQuestion ? 'font-semibold' : ''} ${isAnswer ? 'ml-2' : ''}`}
      >
        {formattedContent}
      </div>
    );
  });
};

export const ChatMessage: React.FC<MessageProps> = ({ message }) => {
  const isBot = message.role === Role.BOT;

  const messageClasses = isBot
    ? 'bg-gradient-to-br from-gray-700 to-gray-800 text-white shadow-lg'
    : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg';
  const containerClasses = isBot ? 'justify-start' : 'justify-end';
  const iconContainerClasses = isBot 
    ? 'bg-gradient-to-br from-gray-600 to-gray-700 shadow-md' 
    : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-md';

  return (
    <div className={`flex items-start gap-3 my-4 ${containerClasses} animate-fadeIn`}>
      {isBot && (
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${iconContainerClasses} ring-2 ring-gray-200/50`}>
          <BotIcon />
        </div>
      )}
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl ${messageClasses} ${
          isBot ? 'rounded-tl-sm' : 'rounded-tr-sm'
        }`}
      >
        <div className="text-[15px] leading-relaxed font-normal tracking-normal">
          {renderFormattedText(message.content)}
        </div>
      </div>
       {!isBot && (
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${iconContainerClasses} ring-2 ring-blue-200/50`}>
          <UserIcon />
        </div>
      )}
    </div>
  );
};
