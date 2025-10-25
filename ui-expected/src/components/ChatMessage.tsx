import { Bot, User } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { motion } from 'motion/react';

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

export function ChatMessage({ message, isTyping }: ChatMessageProps) {
  const isAI = message.type === 'ai';

  return (
    <div className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}>
      {isAI && (
        <Avatar className="h-10 w-10 mt-1 ring-2 ring-[#5B9A68]/30">
          <AvatarFallback className="bg-gradient-to-br from-[#5B9A68] to-emerald-600">
            <Bot className="h-5 w-5 text-white" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col max-w-[80%] ${!isAI && 'items-end'}`}>
        <div
          className={`rounded-2xl px-5 py-3.5 shadow-md ${
            isAI
              ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600'
              : 'bg-gradient-to-br from-[#5B9A68] to-emerald-600 text-white shadow-lg'
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
            <p className={`whitespace-pre-line text-base ${isAI ? 'text-gray-900 dark:text-white' : 'text-white'}`}>
              {message.content}
            </p>
          )}
        </div>

        <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {!isAI && (
        <Avatar className="h-10 w-10 mt-1 ring-2 ring-blue-500/30">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600">
            <User className="h-5 w-5 text-white" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
