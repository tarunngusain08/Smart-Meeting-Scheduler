import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ScheduleMeetingCard } from './ScheduleMeetingCard';
import { TimeSlotCard } from './TimeSlotCard';
import { ScrollArea } from './ui/scroll-area';
import { motion, AnimatePresence } from 'motion/react';
import { handleUserPrompt } from '../api/chat';
import { 
  checkQuickAvailability as checkQuickAvailabilityNew,
  getCalendarEvents,
  findMeetingTimes,
  createMeeting,
  smartScheduleMeeting,
  parseEvent,
  parseMeetingSuggestion,
  type Event,
  type MeetingSuggestion as BackendMeetingSuggestion
} from '../api/calendarNew';
import { format, addDays } from 'date-fns';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  slots?: any[];
  showScheduleWidget?: boolean;
  showAvailability?: boolean;
  scheduleWidgetActive?: boolean; // Track if this widget is active
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

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Call AI API
    setIsTyping(true);
    try {
      const aiResponse = await handleUserPrompt(content);
      const response = parseAIResponse(aiResponse, content);
      
      // Deactivate all previous schedule widgets if this is a new scheduling request
      if (response.showScheduleWidget) {
        setMessages((prev) => 
          prev.map((msg) => ({
            ...msg,
            scheduleWidgetActive: false,
          }))
        );
      }
      
      setMessages((prev) => [...prev, response]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const parseAIResponse = (aiResponse: string, userInput: string): Message => {
    const lowerInput = userInput.toLowerCase();
    const lowerResponse = aiResponse.toLowerCase();
    
    // Check if AI suggests showing schedule widget
    const shouldShowScheduleWidget = 
      lowerInput.includes('schedule') || 
      lowerInput.includes('meeting') ||
      lowerResponse.includes('schedule') ||
      lowerResponse.includes('meeting');
    
    // Check if AI is providing time slots (this would need to be parsed from structured response)
    // For now, we'll use the AI response as-is
    const message: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content: aiResponse,
      timestamp: new Date(),
    };

    // Add schedule widget if appropriate
    if (shouldShowScheduleWidget && !lowerResponse.includes('slot')) {
      message.showScheduleWidget = true;
      message.scheduleWidgetActive = true;
    }

    return message;
  };

  const handleScheduleMeeting = async (data: any) => {
    // Deactivate all previous schedule widgets
    setMessages((prev) => 
      prev.map((msg) => ({
        ...msg,
        scheduleWidgetActive: false,
      }))
    );

    setIsTyping(true);
    try {
      // Extract data from the schedule widget
      const { title, duration, participants, startDate, endDate, meetingHeadline, agenda, priorityAttendees } = data;
      
      // Use the new findMeetingTimes API
      const startTime = startDate || new Date();
      const endTime = endDate || addDays(startTime, 7);
      
      const response = await findMeetingTimes({
        Attendees: participants,
        Duration: duration || 60,
        StartTime: startTime.toISOString(),
        EndTime: endTime.toISOString(),
        MaxSuggestions: 5,
      });

      if (response.suggestions.length > 0) {
        // Format suggestions for display
        const slots = response.suggestions.map((suggestion, index) => {
          const start = new Date(suggestion.start);
          const end = new Date(suggestion.end);
          return {
            id: index.toString(),
            date: format(start, 'EEEE, MMM d'),
            time: `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`,
            duration: duration || 60,
            participants: participants,
            availability: 'All available',
            confidence: suggestion.confidence || 90,
            rawStart: suggestion.start,
            rawEnd: suggestion.end,
            title: meetingHeadline || title || 'Team Meeting',
            meetingHeadline: meetingHeadline || title || 'Team Meeting',
            agenda: agenda,
            priorityAttendees: priorityAttendees,
          };
        });

        const aiMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: `Great! I've found ${slots.length} available time slots for ${participants.length} participant(s). Here are my top recommendations:`,
          timestamp: new Date(),
          slots,
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        const aiMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: response.message || 'Sorry, I couldn\'t find any available time slots for all participants in the specified time range. Would you like to try a different time range?',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error finding meeting times:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `Sorry, I encountered an error while finding available times: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleConfirmSlot = async (slot: any) => {
    setIsTyping(true);
    
    // Simulate API delay
    setTimeout(() => {
      setIsTyping(false);
      
      // Generate mock Teams meeting link
      const mockMeetingId = `mock-${Date.now()}`;
      const mockTeamsLink = `https://teams.microsoft.com/l/meetup-join/mock/${mockMeetingId}`;
      
      // Create mock meeting object with format expected by Sidebar
      const meetingTitle = slot.meetingHeadline || slot.title || 'Team Meeting';
      const meeting = {
        id: mockMeetingId,
        subject: meetingTitle,
        title: meetingTitle,
        start: slot.rawStart,
        end: slot.rawEnd,
        participants: slot.participants,
        date: slot.date,
        time: slot.time,
        duration: typeof slot.duration === 'string' ? slot.duration : `${slot.duration}m`,
        isOnline: true,
        onlineUrl: mockTeamsLink,
      };
      
      // Notify parent component to update sidebar
      onMeetingScheduled(meeting);

      // Send static confirmation message
      const confirmMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `Perfect! I've scheduled your meeting "${meetingTitle}" for ${slot.date} at ${slot.time}.\n\n🔗 Teams Meeting Link: ${mockTeamsLink}\n\nCalendar invites have been sent to all ${slot.participants.length} participant(s). Is there anything else I can help you with?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMessage]);
    }, 1000);
  };

  const handleQuickAction = async (action: string) => {
    setIsTyping(true);
    
    try {
      let timeRange: 'today' | 'tomorrow' | 'next-week' | 'this-week' = 'next-week';
      
      if (action === 'check-next-week') {
        timeRange = 'next-week';
      } else if (action === 'check-this-week') {
        timeRange = 'this-week';
      } else if (action === 'check-today') {
        timeRange = 'today';
      } else if (action === 'check-tomorrow') {
        timeRange = 'tomorrow';
      }
      
      // Get user email from session/context (for now, use a placeholder)
      // In production, this should come from auth context
      const userEmail = 'user@example.com'; // TODO: Get from auth context
      
      // Call the new API
      const response = await checkQuickAvailabilityNew(
        userEmail,
        timeRange,
        selectedParticipants.length > 0 ? selectedParticipants : undefined
      );
      
      // Format response message
      let content = `📅 **Availability for ${response.timeRange}**\n\n`;
      
      const { availability, suggestions } = response;
      
      // Show free slots
      if (availability.freeSlots.length > 0) {
        content += `✅ **Available Slots** (${availability.freeSlots.length} found):\n`;
        availability.freeSlots.slice(0, 5).forEach((slot, index) => {
          const start = new Date(slot.start);
          const end = new Date(slot.end);
          const startTime = format(start, 'EEE, MMM d • h:mm a');
          const endTime = format(end, 'h:mm a');
          content += `${index + 1}. ${startTime} - ${endTime}\n`;
        });
        if (availability.freeSlots.length > 5) {
          content += `\n_...and ${availability.freeSlots.length - 5} more slots_\n`;
        }
      }
      
      // Show busy slots
      if (availability.busySlots.length > 0) {
        content += `\n🔴 **Busy Times** (${availability.busySlots.length} scheduled):\n`;
        availability.busySlots.slice(0, 3).forEach((slot, index) => {
          const start = new Date(slot.start);
          const end = new Date(slot.end);
          const startTime = format(start, 'EEE, MMM d • h:mm a');
          const endTime = format(end, 'h:mm a');
          content += `${index + 1}. ${startTime} - ${endTime}\n`;
        });
        if (availability.busySlots.length > 3) {
          content += `\n_...and ${availability.busySlots.length - 3} more_\n`;
        }
      }
      
      // Show meeting suggestions if attendees were provided
      if (suggestions && suggestions.length > 0) {
        content += `\n\n💡 **Best Meeting Times** (for ${selectedParticipants.length} attendees):\n`;
        suggestions.slice(0, 3).forEach((suggestion, index) => {
          const start = new Date(suggestion.start);
          const end = new Date(suggestion.end);
          const startTime = format(start, 'EEE, MMM d • h:mm a');
          const endTime = format(end, 'h:mm a');
          const confidence = suggestion.confidence ? ` (${Math.round(suggestion.confidence)}% confidence)` : '';
          content += `${index + 1}. ${startTime} - ${endTime}${confidence}\n`;
        });
      }
      
      // Summary
      content += `\n📊 **Summary:**\n`;
      content += `• Free time: ${availability.totalFreeTimeMinutes} minutes\n`;
      content += `• Busy time: ${availability.totalBusyTimeMinutes} minutes\n`;
      
      const aiMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('Error checking quick availability:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `❌ Sorry, I encountered an error checking availability: ${error instanceof Error ? error.message : 'Unknown error'}. Please make sure you're logged in and try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border-2 border-gray-300/60 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-6 bg-gradient-to-b from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-900" ref={scrollRef}>
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
                      isActive={message.scheduleWidgetActive !== false}
                      onClose={() => {
                        setMessages((prev) =>
                          prev.map((msg) =>
                            msg.id === message.id
                              ? { ...msg, scheduleWidgetActive: false }
                              : msg
                          )
                        );
                      }}
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
      <ChatInput onSend={handleSendMessage} onQuickAction={handleQuickAction} />
    </div>
  );
}
