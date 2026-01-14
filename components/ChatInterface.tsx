
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { ICONS } from '../constants';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isGenerating: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isGenerating }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isGenerating) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="w-[400px] border-l border-neutral-800 flex flex-col bg-neutral-900/30">
      <div className="p-4 border-b border-neutral-800 flex items-center space-x-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <ICONS.Code className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-neutral-100">AI Architect</h2>
          <p className="text-[10px] text-neutral-500">Gemini 3 Pro Powered</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-neutral-500">
              "Add a new landing page based on my existing theme" or "Refactor the authentication logic".
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-neutral-800 text-neutral-200 rounded-tl-none border border-neutral-700'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
            <span className="text-[10px] text-neutral-600 mt-1 uppercase tracking-tighter">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {isGenerating && (
          <div className="flex items-center space-x-2 text-neutral-500">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
            <span className="text-xs italic">Architecting response...</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-neutral-800 bg-neutral-900/50">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask to build, refactor, or explain..."
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-neutral-100 transition-all"
            disabled={isGenerating}
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-neutral-700 disabled:text-neutral-500 transition-all"
          >
            <ICONS.Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
