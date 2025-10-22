import React, { useState, useRef, useEffect } from "react";
import { fetchCalendarEvents, checkAvailability } from "../api/calendar";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ScheduleMeetingCard } from "./ScheduleMeetingCard";
import { TimeSlotCard } from "./TimeSlotCard";
import { Sidebar } from "./Sidebar";
import { ScrollArea } from "./ui/scroll-area";
// import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
} from "lucide-react";

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
  onSignOut: () => void;
}

export function ChatInterface({
  onSignOut,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hello! I\'m your AI Meeting Assistant. I can help you schedule meetings, check participant availability, and coordinate across time zones. How can I assist you today?',
      timestamp: new Date(),
    },
  ]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [nextMeeting, setNextMeeting] = useState<any>(null);
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
    setNextMeeting(meeting);

    const confirmMessage: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content: `Perfect! I've scheduled your meeting for ${slot.date} at ${slot.time}. Calendar invites have been sent to all participants. Is there anything else I can help you with?`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, confirmMessage]);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-20 right-20 w-96 h-96 bg-emerald-100 rounded-full opacity-30 blur-3xl animate-blob"
          style={{ mixBlendMode: "multiply" }}
        />
        <div
          className="absolute bottom-20 left-20 w-96 h-96 bg-teal-100 rounded-full opacity-20 blur-3xl animate-blob-delay-2s"
          style={{ mixBlendMode: "multiply" }}
        />
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-50 rounded-full opacity-40 blur-3xl animate-blob-delay-4s"
          style={{ mixBlendMode: "multiply" }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between max-w-[1400px]">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 p-2 shadow-lg shadow-emerald-500/20">
              <img
                src="/images/gruve-logo.png"
                alt="Gruve Logo"
                className="h-6 w-6 text-white"
              />
            </div>
            <div>
              <h1 className="text-slate-900 dark:text-white tracking-tight">
                AI Meeting Assistant
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Smart scheduling made simple</p>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onSignOut}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors duration-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <div className="relative z-10 max-w-[1400px] mx-auto p-4 h-[calc(100vh-80px)] flex gap-6">
        {/* Left Column - Chat Interface */}
        <div className="flex-1 flex flex-col">
          <div className="flex flex-col h-full rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-xl shadow-slate-900/5 overflow-hidden">
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-6" ref={scrollRef}>
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-300"
                  >
                    <ChatMessage message={message} />
                    
                    {message.showScheduleWidget && (
                      <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-200">
                        <ScheduleMeetingCard 
                          onSchedule={handleScheduleMeeting}
                          selectedParticipants={selectedParticipants}
                          setSelectedParticipants={setSelectedParticipants}
                        />
                      </div>
                    )}

                    {message.slots && (
                      <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-300">
                        {message.slots.map((slot) => (
                          <TimeSlotCard
                            key={slot.id}
                            slot={slot}
                            onConfirm={handleConfirmSlot}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <ChatMessage
                      message={{
                        id: 'typing',
                        type: 'ai',
                        content: '',
                        timestamp: new Date(),
                      }}
                      isTyping
                    />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <ChatInput onSend={handleSendMessage} />
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="w-80">
          <Sidebar 
            selectedParticipants={selectedParticipants} 
            nextMeeting={nextMeeting} 
          />
        </div>
      </div>
    </div>
  );
}