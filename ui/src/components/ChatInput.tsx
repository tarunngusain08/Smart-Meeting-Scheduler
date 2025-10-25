import { useState } from 'react';
import { Send, Mic } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface ChatInputProps {
  onSend: (message: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t-2 border-gray-300/60 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 p-4">
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to schedule, check availability, or coordinate across time zones…"
            className="min-h-[56px] max-h-[120px] resize-none rounded-xl pr-12 bg-white dark:bg-slate-700 border-2 border-gray-300/60 dark:border-slate-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-emerald-500"
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-2 bottom-2 h-8 w-8 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Mic className="h-4 w-4" />
          </Button>
        </div>

        <Button
          onClick={handleSend}
          disabled={!input.trim()}
          className="h-[56px] w-[56px] rounded-xl bg-[#10B981] hover:bg-[#059669] text-white shadow-xl shadow-emerald-500/50 disabled:opacity-50 disabled:shadow-none disabled:bg-gray-400 transition-all"
        >
          <Send className="h-6 w-6 text-white stroke-[3]" />
        </Button>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>Try:</span>
        <button
          onClick={() => setInput('/check next week')}
          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          /check next week
        </button>
        <button
          onClick={() => setInput('Schedule a team meeting')}
          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Schedule a team meeting
        </button>
      </div>
    </div>
  );
}
