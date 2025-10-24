import React, { useState, useRef, useEffect } from "react";
import { handleUserPrompt } from "../api/chat";
import {
  Send,
  Sparkles,
  Calendar,
  Clock,
  LogOut,
  Mic,
  Paperclip,
} from "lucide-react";
import { ParticipantSelector } from "./ui/participant-selector";
import { AttendeesCard } from "./ui/attendees-card";
import { ScheduleMeetingModal } from "./ui/schedule-meeting-modal";
import { AIInsightsPanel } from "./ui/ai-insights-panel";
import { SelectedParticipantsPanel } from "./ui/selected-participants-panel";
import { TimeZonePanel } from "./ui/timezone-panel";
import { TypingIndicator } from "./ui/typing-indicator";

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

interface ChatInterfaceProps {
  onSignOut: () => void;
}

export function ChatInterface({ onSignOut }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your AI Meeting Assistant. I can help you schedule meetings, check participant availability, and coordinate across time zones. How can I assist you today?",
      sender: "assistant" as const,
      timestamp: new Date(),
    }
  ]);
  
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [participants, setParticipants] = useState<{ email: string; name?: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Get AI response from the chat API
  const getAIResponse = async (userInput: string): Promise<string> => {
    try {
      const response = await handleUserPrompt(userInput);
      return response;
    } catch (error) {
      console.error('Error getting AI response:', error);
      throw error;
    }
  };

  // Handle sending message on Enter key (without Shift)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle quick reply button clicks
  const handleQuickReply = (message: string) => {
    setInputValue(message);
    setTimeout(() => handleSend(), 100);
  };

  // Handle sending a message
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user" as const,
      timestamp: new Date(),
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setShowTyping(true);

    try {
      // Get AI response
      const aiResponse = await getAIResponse(inputValue);
      setShowTyping(false);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: "assistant" as const,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setShowTyping(false);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        sender: "assistant" as const,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle scheduling a meeting
  const handleScheduleMeeting = (data: {
    participants: string[];
    dateRange: "today" | "this-week" | "next-week";
    duration: number;
  }) => {
    setIsScheduleModalOpen(false);
    
    // Create a message based on the selection
    const dateRangeText = data.dateRange === "today" ? "today" : 
                          data.dateRange === "this-week" ? "this week" : "next week";
    const message = `Find optimal slots for a ${data.duration}-minute meeting with ${data.participants.length} participant(s) ${dateRangeText}`;
    
    setInputValue(message);
    setTimeout(() => handleSend(), 100);
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-20 right-20 w-96 h-96 bg-green-100 rounded-full opacity-30 blur-3xl animate-blob"
          style={{ mixBlendMode: "multiply" }}
        />
        <div
          className="absolute bottom-20 left-20 w-96 h-96 bg-green-200 rounded-full opacity-20 blur-3xl animate-blob-delay-2s"
          style={{ mixBlendMode: "multiply" }}
        />
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-50 rounded-full opacity-40 blur-3xl animate-blob-delay-4s"
          style={{ mixBlendMode: "multiply" }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0">
        <div className="w-full px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Gruve Logo */}
              <div className="w-8 h-8 bg-[#5b9a68] rounded-lg shadow-md flex items-center justify-center hover:scale-110 hover:rotate-3 transition-transform duration-300 cursor-pointer overflow-hidden">
                <img
                  src="/images/gruve-logo.png"
                  alt="Gruve Logo"
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">
                  AI-Powered Meeting Assistant
                </span>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area with Sidebar */}
      <div className="relative z-0 w-full h-[calc(100vh-64px)] flex px-4 py-4 gap-4">
        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden max-w-4xl">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent bg-gray-50/30">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="flex items-start space-x-3 max-w-[85%]">
                {message.sender === "assistant" && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold shadow-md flex-shrink-0">
                    G
                  </div>
                )}
                <div className="flex flex-col space-y-1 flex-1">
                  <div
                    className={`rounded-2xl px-5 py-3.5 shadow-sm transition-all duration-200 ${
                      message.sender === "user"
                        ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-md ml-auto"
                        : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-md"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{message.content}</p>
                  </div>
                  <p
                    className={`text-[11px] px-2 text-gray-500 ${
                      message.sender === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {message.sender === "user" && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold shadow-md flex-shrink-0">
                    U
                  </div>
                )}
              </div>
            </div>
          ))}
          {showTyping && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 rounded-bl-md">
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-5">
          <div className="w-full">
            {/* Quick Command Chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setInputValue("/check next week")}
                className="inline-flex items-center px-4 py-2 text-[12px] font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full transition-all duration-200 hover:shadow-sm"
              >
                /check next week
              </button>
              <button
                onClick={() => setInputValue("Schedule a team meeting")}
                className="inline-flex items-center px-4 py-2 text-[12px] font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full transition-all duration-200 hover:shadow-sm"
              >
                Schedule a team meeting
              </button>
              <button
                onClick={() => setInputValue("Check availability for tomorrow")}
                className="inline-flex items-center px-4 py-2 text-[12px] font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full transition-all duration-200 hover:shadow-sm"
              >
                Check availability for tomorrow
              </button>
            </div>
            <div className="flex items-end space-x-2">
              <div className="flex-1 relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask me to schedule, find the best meeting slot, or check availability..."
                  className="w-full min-h-[80px] max-h-40 p-4 pr-32 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 resize-none bg-white text-[14px] placeholder:text-gray-500"
                  disabled={isLoading}
                />
                <div className="absolute right-3 bottom-3 flex space-x-1">
                  <button
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="p-1.5 text-gray-400 hover:text-emerald-600 transition-all duration-200 rounded-md hover:bg-emerald-50"
                    disabled={isLoading}
                    title="Schedule Meeting"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 text-gray-400 hover:text-blue-600 transition-all duration-200 rounded-md hover:bg-blue-50"
                    disabled={isLoading}
                    title="Voice Input"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 text-gray-400 hover:text-purple-600 transition-all duration-200 rounded-md hover:bg-purple-50"
                    disabled={isLoading}
                    title="Attach File"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button
                onClick={handleSend}
                className={`p-3 rounded-xl transition-all duration-300 ${
                  inputValue.trim() && !isLoading
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:shadow-md hover:scale-105"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
                disabled={!inputValue.trim() || isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

        {/* Right Sidebar - Insights Panel */}
        <aside className="w-96 flex-shrink-0 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          <SelectedParticipantsPanel participants={participants} />
          <AIInsightsPanel />
          <TimeZonePanel />
        </aside>
      </div>

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        participants={participants}
        setParticipants={setParticipants}
        onSchedule={handleScheduleMeeting}
      />
    </div>
  );
}