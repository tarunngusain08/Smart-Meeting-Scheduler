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
        <Avatar className="h-8 w-8 mt-1 ring-2 ring-emerald-500/20">
          <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500">
            <Bot className="h-4 w-4 text-white" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col max-w-[80%] ${!isAI && 'items-end'}`}>
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            isAI
              ? 'bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-800/50 border border-slate-200/50 dark:border-slate-700/50'
              : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/20'
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
            <p className={`whitespace-pre-line ${isAI ? 'text-slate-700 dark:text-slate-200' : 'text-white'}`}>
              {message.content}
            </p>
          )}
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {!isAI && (
        <Avatar className="h-8 w-8 mt-1 ring-2 ring-emerald-500/20">
          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500">
            <User className="h-4 w-4 text-white" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
