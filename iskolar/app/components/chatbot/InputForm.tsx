import React, { useState } from 'react';
import { SendIcon } from './Icons';

interface InputFormProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({ onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="p-5 border-t border-gray-200 bg-white shadow-lg">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your question here..."
          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm placeholder:text-gray-400 bg-gray-50 hover:bg-white"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3.5 rounded-2xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
          disabled={isLoading || !inputValue.trim()}
        >
          <SendIcon />
        </button>
      </form>
      <p className="text-xs text-gray-400 mt-3 text-center font-medium">
        Ask me about applications, status, or scholarships
      </p>
    </div>
  );
};
