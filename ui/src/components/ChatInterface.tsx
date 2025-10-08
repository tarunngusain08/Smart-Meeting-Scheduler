import React, { useState, useRef, useEffect } from "react";

import {
  Send,
  Bot,
  Sparkles,
  Calendar,
  Clock,
  LogOut,
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

interface ChatInterfaceProps {
  onSignOut: () => void;
}

export function ChatInterface({
  onSignOut,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I'm Gruve, your AI-powered meeting scheduler. I can help you coordinate meetings across time zones, check availability, and send invitations. What would you like to schedule today?",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: getAIResponse(inputValue),
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const getAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    if (
      input.includes("schedule") ||
      input.includes("meeting")
    ) {
      return "I'd be happy to help you schedule a meeting! Could you tell me:\n\n• Who needs to attend?\n• What's the preferred duration?\n• Any specific time preferences?\n• Which time zones should I consider?\n\nI'll find the optimal time for everyone!";
    }

    if (
      input.includes("availability") ||
      input.includes("free")
    ) {
      return "I can check availability across multiple calendars and time zones. Please share:\n\n• The participants' names or emails\n• Your preferred date range\n• Meeting duration\n\nI'll show you all the available slots that work for everyone.";
    }

    if (
      input.includes("timezone") ||
      input.includes("time zone")
    ) {
      return "Time zone coordination is one of my specialties! I can:\n\n• Find overlap between multiple time zones\n• Suggest fair rotation schedules\n• Convert meeting times automatically\n• Consider working hours preferences\n\nWhat time zones are you working with?";
    }

    return "I understand you'd like help with scheduling. I can assist with:\n\n• Finding optimal meeting times\n• Checking participant availability\n• Managing time zone differences\n• Sending calendar invitations\n\nCould you provide more details about what you need?";
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (message: string) => {
    setInputValue(message);
    setTimeout(() => handleSend(), 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 relative overflow-hidden">
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
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Gruve Logo */}
              <div className="w-10 h-10 bg-[#5b9a68] rounded-xl shadow-lg flex items-center justify-center hover:scale-110 hover:rotate-3 transition-transform duration-300 cursor-pointer overflow-hidden">
                <img
                  src="/images/gruve-logo.png"
                  alt="Gruve Logo"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">
                    AI-Powered Meeting Assistant
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="relative z-10 max-w-4xl mx-auto p-4 h-[calc(100vh-80px)] flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-thin scrollbar-thumb-green-200 scrollbar-track-transparent">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} animate-slideUp`}
            >
              <div
                className={`max-w-[80%] ${message.sender === "user" ? "order-last" : ""}`}
              >
                {message.sender === "ai" && (
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-green-600 animate-pulse" />
                    </div>
                    <span className="text-xs text-gray-500">
                      AI Assistant
                    </span>
                  </div>
                )}
                <div
                  className={`px-6 py-4 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform duration-200 ${
                    message.sender === "user"
                      ? "bg-gradient-to-r from-[#00B140] to-[#009936] text-white"
                      : "bg-white border border-gray-200 text-gray-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                    {message.content}
                  </p>
                  <div
                    className={`text-xs mt-2 opacity-70 ${message.sender === "user" ? "text-green-100" : "text-gray-500"}`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start animate-fadeIn">
              <div className="max-w-[80%]">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-green-600 animate-pulse" />
                  </div>
                  <span className="text-xs text-gray-500">
                    AI Assistant is typing...
                  </span>
                </div>
                <div className="bg-white border border-gray-200 px-6 py-4 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Reply Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() =>
              handleQuickReply("Schedule a meeting")
            }
            className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-[#00B140] hover:bg-white transition-all duration-300"
          >
            <Calendar className="w-4 h-4" />
            <span>Schedule Meeting</span>
          </button>
          <button
            onClick={() =>
              handleQuickReply("Check availability")
            }
            className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-[#00B140] hover:bg-white transition-all duration-300"
          >
            <Clock className="w-4 h-4" />
            <span>Check Availability</span>
          </button>
        </div>

        {/* Input Area */}
        <div
          className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border transition-all duration-300 ${
            isFocused
              ? "border-[#00B140] shadow-green-100/50"
              : "border-gray-200"
          }`}
        >
          <div className="flex items-end p-4 space-x-3">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Ask me to schedule a meeting, check availability, or coordinate across time zones..."
              className="flex-1 bg-transparent border-none outline-none resize-none text-[15px] text-gray-800 placeholder-gray-400 max-h-32"
              rows={1}
              style={{ minHeight: "24px" }}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className={`p-3 rounded-xl transition-all duration-300 ${
                inputValue.trim()
                  ? "bg-gradient-to-r from-[#00B140] to-[#009936] text-white hover:shadow-lg hover:shadow-green-200 hover:scale-105"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}