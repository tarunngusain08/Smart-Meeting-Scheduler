import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
// import { motion } from 'framer-motion';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
}

export function ChatMessage({ message, isTyping = false }: ChatMessageProps) {
  const isUser = message.type === 'user';

  if (isTyping) {
    return (
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 ring-2 ring-emerald-500/20">
          <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=AI" />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-4 duration-300`}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 ring-2 ring-emerald-500/20">
          <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=AI" />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
      )}
      
      <div className={`flex-1 ${isUser ? 'flex justify-end' : ''}`}>
        <div
          className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-md'
              : 'bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-tl-md'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <p className={`text-xs mt-2 ${
            isUser ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'
          }`}>
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
