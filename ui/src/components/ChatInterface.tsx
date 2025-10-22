import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ScheduleMeetingCard } from './ScheduleMeetingCard';
import { TimeSlotCard } from './TimeSlotCard';
import { ScrollArea } from './ui/scroll-area';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  slots?: any[];
  showScheduleWidget?: boolean;
  showAvailability?: boolean;
}

interface ChatInterfaceProps {
  selectedParticipants: string[];
  setSelectedParticipants: (participants: string[]) => void;
  onMeetingScheduled: (meeting: any) => void;
}

export function ChatInterface({ selectedParticipants, setSelectedParticipants, onMeetingScheduled }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hello! I\'m your AI Meeting Assistant. I can help you schedule meetings, check participant availability, and coordinate across time zones. How can I assist you today?',
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Simulate AI response
    setIsTyping(true);
    setTimeout(() => {
      const response = generateAIResponse(content);
      setMessages((prev) => [...prev, response]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string): Message => {
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('schedule') || lowerInput.includes('meeting')) {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: 'I\'d be happy to help you schedule a meeting! Let me show you the scheduling interface where you can select participants, choose a date range, and I\'ll find the optimal time slots.',
        timestamp: new Date(),
        showScheduleWidget: true,
      };
    } else if (lowerInput.includes('availability') || lowerInput.includes('available')) {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: 'Let me check the availability for your selected participants. Here are the best time slots I found:',
        timestamp: new Date(),
        slots: [
          {
            id: '1',
            date: 'Tomorrow',
            time: '2:00 PM - 3:00 PM',
            duration: '1 hour',
            participants: ['Sarah Johnson', 'Mike Chen', 'Alex Rivera'],
            availability: 'All available',
            confidence: 95,
          },
          {
            id: '2',
            date: 'Friday',
            time: '10:00 AM - 11:00 AM',
            duration: '1 hour',
            participants: ['Sarah Johnson', 'Mike Chen', 'Alex Rivera'],
            availability: 'All available',
            confidence: 88,
          },
          {
            id: '3',
            date: 'Next Monday',
            time: '3:00 PM - 4:00 PM',
            duration: '1 hour',
            participants: ['Sarah Johnson', 'Mike Chen', 'Alex Rivera'],
            availability: 'All available',
            confidence: 82,
          },
        ],
      };
    } else if (lowerInput.includes('time zone') || lowerInput.includes('timezone')) {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: 'I can help coordinate meetings across different time zones. Currently, I\'m showing times in Pacific Time (PT). Would you like to add participants from different time zones? I\'ll automatically adjust the displayed times.',
        timestamp: new Date(),
      };
    } else {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: 'I can help you with:\n• Scheduling new meetings\n• Checking participant availability\n• Finding optimal meeting times\n• Coordinating across time zones\n\nWhat would you like to do?',
        timestamp: new Date(),
      };
    }
  };

  const handleScheduleMeeting = (data: any) => {
    setIsTyping(true);
    setTimeout(() => {
      const response: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `Great! I've found the best available slots for ${data.participants.length} participants. Here are my top recommendations:`,
        timestamp: new Date(),
        slots: [
          {
            id: '1',
            date: 'Tomorrow',
            time: '2:00 PM - 3:00 PM',
            duration: data.duration,
            participants: data.participants,
            availability: 'All available',
            confidence: 95,
          },
          {
            id: '2',
            date: 'Thursday',
            time: '10:00 AM - 11:00 AM',
            duration: data.duration,
            participants: data.participants,
            availability: 'All available',
            confidence: 88,
          },
        ],
      };
      setMessages((prev) => [...prev, response]);
      setIsTyping(false);
    }, 2000);
  };

  const handleConfirmSlot = (slot: any) => {
    const meeting = {
      title: 'Team Meeting',
      date: slot.date,
      time: slot.time,
      duration: slot.duration,
      participants: slot.participants,
    };
    onMeetingScheduled(meeting);

    const confirmMessage: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content: `Perfect! I've scheduled your meeting for ${slot.date} at ${slot.time}. Calendar invites have been sent to all participants. Is there anything else I can help you with?`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, confirmMessage]);
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-xl shadow-slate-900/5 overflow-hidden">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ChatMessage message={message} />
                
                {message.showScheduleWidget && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-4"
                  >
                    <ScheduleMeetingCard 
                      onSchedule={handleScheduleMeeting}
                      selectedParticipants={selectedParticipants}
                      setSelectedParticipants={setSelectedParticipants}
                    />
                  </motion.div>
                )}

                {message.slots && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-4 space-y-3"
                  >
                    {message.slots.map((slot) => (
                      <TimeSlotCard
                        key={slot.id}
                        slot={slot}
                        onConfirm={handleConfirmSlot}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ChatMessage
                message={{
                  id: 'typing',
                  type: 'ai',
                  content: '',
                  timestamp: new Date(),
                }}
                isTyping
              />
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <ChatInput onSend={handleSendMessage} />
    </div>
  );
}
