import { Bot, User } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { motion } from 'motion/react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isSearching?: boolean;
}

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
}

export function ChatMessage({ message, isTyping }: ChatMessageProps) {
  const isAI = message.type === 'ai';

  return (
    <div className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}>
      {isAI && (
        <Avatar className="h-10 w-10 mt-1 ring-2 ring-emerald-500 shadow-lg">
          <AvatarFallback className="bg-[#10B981]">
            <Bot className="h-6 w-6 text-white stroke-[3]" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col max-w-[80%] ${!isAI && 'items-end'}`}>
        <div
          className={`rounded-2xl px-6 py-4 shadow-md ${
            isAI
              ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-2 border-emerald-200 dark:border-slate-600'
              : 'user-message-bubble'
          }`}
        >
          {isTyping ? (
            <div className="flex gap-1.5 py-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full"
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
          ) : (
            <p className={`whitespace-pre-line text-base font-medium ${
              message.isSearching 
                ? 'text-gray-500 dark:text-gray-400 italic' 
                : isAI ? 'text-gray-900 dark:text-white' : 'user-message-text'
            }`}>
              {message.content}
              {message.isSearching && <span className="animate-pulse ml-1">|</span>}
            </p>
          )}
        </div>

        <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {!isAI && (
        <Avatar className="h-10 w-10 mt-1 ring-2 ring-emerald-500 shadow-lg">
          <AvatarFallback className="bg-gradient-to-br from-[#10B981] to-[#059669]">
            <User className="h-6 w-6 text-white stroke-[2.5]" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
