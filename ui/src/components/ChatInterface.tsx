import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ScheduleMeetingCard } from './ScheduleMeetingCard';
import { TimeSlotCard } from './TimeSlotCard';
import { motion, AnimatePresence } from 'motion/react';
import { handleUserPrompt } from '../api/chat';
import { 
  checkQuickAvailability as checkQuickAvailabilityNew,
  findMeetingTimes,
  createMeeting,
  type CreateMeetingRequest
} from '../api/calendarNew';
import { format, addDays } from 'date-fns';
import { getAllUsers } from '../api/users';
import { toast } from 'sonner';

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
  onQuickAction?: (action: string) => void;
  onScheduleMeeting?: () => void;
}

export function ChatInterface({ selectedParticipants, setSelectedParticipants, onMeetingScheduled, onQuickAction, onScheduleMeeting }: ChatInterfaceProps) {
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
    
    // Only show schedule widget if user explicitly asks to schedule or check availability
    // Be more specific - look for action words combined with schedule/meeting keywords
    const isScheduleRequest = 
      (lowerInput.includes('schedule') && (lowerInput.includes('meeting') || lowerInput.includes('a meeting') || lowerInput.includes('call'))) ||
      (lowerInput.includes('book') && lowerInput.includes('meeting')) ||
      (lowerInput.includes('set up') && lowerInput.includes('meeting')) ||
      (lowerInput.includes('arrange') && lowerInput.includes('meeting')) ||
      (lowerInput.includes('create') && lowerInput.includes('meeting'));
    
    // Check if it's an availability check request
    const isAvailabilityRequest = 
      lowerInput.includes('check availability') ||
      lowerInput.includes('find time') ||
      lowerInput.includes('available slot') ||
      lowerInput.includes('free time');
    
    const message: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content: aiResponse,
      timestamp: new Date(),
    };

    // Only add schedule widget if it's an explicit scheduling or availability request
    // AND the response doesn't already contain slots
    if ((isScheduleRequest || isAvailabilityRequest) && !lowerResponse.includes('slot')) {
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

    // Extract data from the schedule widget
    const { title, duration, participants, startDate, endDate, meetingHeadline, agenda, priorityAttendees, participantsWithTimezone } = data;

    // Immediate acknowledgment message with typing animation
    const acknowledgmentMessageId = `ack-${Date.now()}`;
    const acknowledgmentMessage: Message = {
      id: acknowledgmentMessageId,
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isSearching: true, // Special flag for search animation
    };
    setMessages((prev) => [...prev, acknowledgmentMessage]);

    // Start typing animation
    setIsTyping(true);
    
    // Search quotes to rotate through
    const searchQuotes = [
      `🔍 Analyzing calendars for all ${participants.length} attendees...`,
      `⏰ Checking timezone compatibility (${participantsWithTimezone?.[0]?.timezone || 'multiple timezones'})...`,
      `📅 Scanning availability across the date range...`,
      priorityAttendees && priorityAttendees.length > 0 
        ? `⭐ Prioritizing availability for ${priorityAttendees.length} key attendee${priorityAttendees.length > 1 ? 's' : ''}...`
        : `🎯 Finding slots where everyone is available...`,
      `🧠 Using AI to optimize meeting suggestions...`,
      `✨ Considering working hours and preferences...`,
      `🔄 Broadening search across the entire week...`,
      `📊 Calculating best time slots with highest attendance...`,
    ];

    let currentQuoteIndex = 0;
    let currentText = '';
    let isTyping = true;
    let charIndex = 0;

    // Character-by-character typing and deleting animation
    const typeInterval = setInterval(() => {
      const targetQuote = searchQuotes[currentQuoteIndex];
      
      if (isTyping) {
        // Typing phase
        if (charIndex < targetQuote.length) {
          currentText = targetQuote.substring(0, charIndex + 1);
          charIndex++;
        } else {
          // Hold the complete text for a moment
          setTimeout(() => {
            isTyping = false;
            charIndex = targetQuote.length;
          }, 2000); // Hold for 2 seconds
          return;
        }
      } else {
        // Deleting phase
        if (charIndex > 0) {
          currentText = targetQuote.substring(0, charIndex - 1);
          charIndex--;
        } else {
          // Move to next quote
          isTyping = true;
          currentQuoteIndex = (currentQuoteIndex + 1) % searchQuotes.length;
          currentText = '';
        }
      }

      // Update the message
      setMessages((prev) => {
        const newMessages = [...prev];
        const msgIndex = newMessages.findIndex(m => m.id === acknowledgmentMessageId);
        if (msgIndex !== -1) {
          newMessages[msgIndex] = {
            ...newMessages[msgIndex],
            content: currentText,
          };
        }
        return newMessages;
      });
    }, 50); // 50ms per character for smooth animation

    try {
      // Use the new findMeetingTimes API
      const startTime = startDate || new Date();
      const endTime = endDate || addDays(startTime, 7);
      
      // Ensure we have AttendeeWithTimezone format, fallback to converting string[] if needed
      const attendeesFormatted = participantsWithTimezone || 
        (Array.isArray(participants) ? participants.map((p: string) => ({ email: p })) : []);
      
      const response = await findMeetingTimes({
        Attendees: attendeesFormatted,
        PriorityAttendees: priorityAttendees, // Already includes timezone data
        Duration: duration || 60,
        StartTime: startTime.toISOString(),
        EndTime: endTime.toISOString(),
        MaxSuggestions: 5,
      });

      // Clear the typing animation
      clearInterval(typeInterval);

      // Remove the acknowledgment message and show results
      setMessages((prev) => prev.filter(msg => msg.id !== acknowledgmentMessageId));

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
          content: `Perfect! I've analyzed ${participants.length} calendar${participants.length > 1 ? 's' : ''} and found ${slots.length} optimal time slots${priorityAttendees && priorityAttendees.length > 0 ? ` (prioritizing ${priorityAttendees.length} key attendee${priorityAttendees.length > 1 ? 's' : ''})` : ''}. Here are my top recommendations:`,
          timestamp: new Date(),
          slots,
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        const aiMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: response.message || `I've searched thoroughly but couldn't find any time slots where all ${participants.length} participants are available in the specified date range. Would you like to try a different time range or consider optional attendees?`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error finding meeting times:', error);
      clearInterval(typeInterval);
      
      // Remove acknowledgment message
      setMessages((prev) => prev.filter(msg => msg.id === acknowledgmentMessageId));
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `Sorry, I encountered an error while searching for available times: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleConfirmSlot = async (slot: any) => {
    setIsTyping(true);
    
    try {
      // First, remove all unconfirmed slots from the UI with animation
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.slots && msg.slots.length > 0) {
            // Find the confirmed slot
            const confirmedSlot = msg.slots.find((s) => s.id === slot.id);
            if (confirmedSlot) {
              // Keep only the confirmed slot temporarily (for animation)
              // We'll remove it completely after a brief delay
              return {
                ...msg,
                slots: [confirmedSlot], // Keep only confirmed slot
              };
            }
          }
          return msg;
        })
      );

      // Get attendee emails from participant names
      let attendeeEmails: string[] = [];
      
      try {
        const allUsers = await getAllUsers();
        const participantsMap = new Map(
          allUsers.map(user => [user.displayName, user.email])
        );
        
        // Map participant names to emails
        attendeeEmails = slot.participants
          .map((name: string) => participantsMap.get(name))
          .filter((email: string | undefined): email is string => email !== undefined);
        
        // If we couldn't map all participants, use names as fallback
        // (backend might handle name-to-email conversion)
        if (attendeeEmails.length === 0) {
          attendeeEmails = slot.participants;
        }
      } catch (error) {
        console.warn('Failed to fetch users for email mapping, using participant names:', error);
        // Fallback: use participant names directly (backend might handle conversion)
        attendeeEmails = slot.participants;
      }

      // Parse start and end times from ISO strings
      const startTime = new Date(slot.rawStart);
      const endTime = new Date(slot.rawEnd);

      // Prepare meeting request
      const meetingRequest: CreateMeetingRequest = {
        subject: slot.meetingHeadline || slot.title || 'Team Meeting',
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        attendees: attendeeEmails,
        description: slot.agenda || undefined,
        location: undefined,
        isOnline: false, // Can be made configurable
      };

      // Call the backend API to create the meeting
      const result = await createMeeting(meetingRequest);

      // Create meeting object with format expected by Sidebar
      const meeting = {
        id: result.event.id,
        subject: result.event.subject,
        title: result.event.subject,
        start: result.event.start,
        end: result.event.end,
        participants: slot.participants,
        date: slot.date,
        time: slot.time,
        duration: typeof slot.duration === 'string' ? slot.duration : `${slot.duration}m`,
        isOnline: result.event.isOnline,
        onlineUrl: result.event.onlineUrl,
      };

      // Notify parent component to update sidebar
      onMeetingScheduled(meeting);

      // Show success toast
      toast.success('Meeting scheduled successfully!', {
        description: `Calendar invites have been sent to all ${attendeeEmails.length} participant(s).`,
      });

      // Remove the confirmed slot from the message as well (after animation completes)
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.slots && msg.slots.length > 0) {
              return {
                ...msg,
                slots: undefined, // Remove slots completely
              };
            }
            return msg;
          })
        );
      }, 600); // Wait for exit animation to complete and show confirmation briefly

      // Send success confirmation message
      const confirmMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `Perfect! I've scheduled your meeting "${meeting.subject}" for ${slot.date} at ${slot.time}.\n\n✅ Meeting created successfully!\n📧 Calendar invites have been sent to all ${attendeeEmails.length} participant(s).\n\n${result.event.onlineUrl ? `🔗 ${result.event.isOnline ? 'Online Meeting Link' : 'Meeting Link'}: ${result.event.onlineUrl}\n\n` : ''}Is there anything else I can help you with?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMessage]);
    } catch (error) {
      console.error('Failed to create meeting:', error);
      
      // Show error toast
      toast.error('Failed to schedule meeting', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });

      // Send error message to chat
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `Sorry, I encountered an error while scheduling your meeting: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or select a different time slot.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
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
      
      // Get logged-in user email from localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: '❌ **Authentication Error**\n\nPlease log in to check your availability. Your session may have expired.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsTyping(false);
        return;
      }

      let userEmail: string;
      try {
        const userData = JSON.parse(userStr);
        userEmail = userData.email || userData.userPrincipalName;
        if (!userEmail) {
          throw new Error('No email found in user data');
        }
      } catch (error) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: '❌ **Authentication Error**\n\nUnable to retrieve your email. Please log in again.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsTyping(false);
        return;
      }
      
      // Call the new API
      const response = await checkQuickAvailabilityNew(
        userEmail,
        timeRange,
        selectedParticipants.length > 0 ? selectedParticipants : undefined
      );
      
      // Format response message
      let content = `📅 **Availability for ${response.timeRange}**\n\n`;
      
      const { availability, suggestions } = response;
      
      // Ensure arrays exist (handle null/undefined)
      const freeSlots = availability.freeSlots || [];
      const busySlots = availability.busySlots || [];
      
      // Show free slots
      if (freeSlots.length > 0) {
        content += `✅ **Available Slots** (${freeSlots.length} found):\n`;
        freeSlots.slice(0, 5).forEach((slot, index) => {
          const start = new Date(slot.start);
          const end = new Date(slot.end);
          const startTime = format(start, 'EEE, MMM d • h:mm a');
          const endTime = format(end, 'h:mm a');
          content += `${index + 1}. ${startTime} - ${endTime}\n`;
        });
        if (freeSlots.length > 5) {
          content += `\n_...and ${freeSlots.length - 5} more slots_\n`;
        }
      } else {
        content += `⚠️ **No Available Slots Found**\n\n`;
        if (busySlots.length > 0) {
          content += `You have ${busySlots.length} meeting${busySlots.length > 1 ? 's' : ''} scheduled during this period. `;
        } else {
          content += `This appears to be a weekend or outside working hours. `;
        }
        content += `Consider checking a different time range or adjusting your schedule.`;
      }
      
      // Show busy slots
      if (busySlots.length > 0) {
        content += `\n🔴 **Busy Times** (${busySlots.length} scheduled):\n`;
        busySlots.slice(0, 3).forEach((slot, index) => {
          const start = new Date(slot.start);
          const end = new Date(slot.end);
          const startTime = format(start, 'EEE, MMM d • h:mm a');
          const endTime = format(end, 'h:mm a');
          content += `${index + 1}. ${startTime} - ${endTime}\n`;
        });
        if (busySlots.length > 3) {
          content += `\n_...and ${busySlots.length - 3} more_\n`;
        }
      }
      
      // Show meeting suggestions if attendees were provided
      if (suggestions && Array.isArray(suggestions) && suggestions.length > 0) {
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
      content += `• Free time: ${availability.totalFreeTimeMinutes || 0} minutes\n`;
      content += `• Busy time: ${availability.totalBusyTimeMinutes || 0} minutes\n`;
      
      const aiMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      
    } catch (error: any) {
      console.error('Error checking quick availability:', error);
      let errorContent = '❌ **Error Checking Availability**\n\n';
      
      if (error?.message?.includes('Failed to check availability') || error?.response?.status === 500) {
        errorContent += 'Unable to retrieve your calendar data. Please try again or check your connection.';
      } else if (error?.response?.status === 400 && error?.response?.data?.message) {
        errorContent += error.response.data.message;
      } else if (error?.message?.includes('Authentication') || error?.response?.status === 401) {
        errorContent += 'Your session may have expired. Please log in again.';
      } else {
        errorContent += error?.message || 'An unexpected error occurred. Please try again.';
      }
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle schedule meeting trigger from external component
  const triggerScheduleMeeting = () => {
    const scheduleMessage: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content: 'I\'d be happy to help you schedule a meeting! Let me show you the scheduling interface where you can select participants, choose a date range, and I\'ll find the optimal time slots.',
      timestamp: new Date(),
      showScheduleWidget: true,
      scheduleWidgetActive: true,
    };
    setMessages((prev) => [...prev, scheduleMessage]);
  };

  // Expose handlers to parent/window for LeftSidebar access
  useEffect(() => {
    (window as any).__chatInterfaceHandlers = {
      handleQuickAction,
      triggerScheduleMeeting,
    };

    return () => {
      delete (window as any).__chatInterfaceHandlers;
    };
  }, [handleQuickAction]); // Include handleQuickAction in deps

  return (
    <div className="flex flex-col h-full rounded-2xl border-2 border-gray-300/60 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-900 scroll-smooth" ref={scrollRef}>
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ 
                  duration: 0.4, 
                  ease: [0.4, 0, 0.2, 1],
                  opacity: { duration: 0.3 }
                }}
              >
                <ChatMessage message={message} />
                
                {message.showScheduleWidget && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ 
                      delay: 0.2, 
                      duration: 0.4,
                      ease: [0.4, 0, 0.2, 1]
                    }}
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

                {message.slots && message.slots.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-4 space-y-3"
                  >
                    <AnimatePresence mode="popLayout">
                      {message.slots.map((slot) => (
                        <motion.div
                          key={slot.id}
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ 
                            opacity: 0, 
                            y: -20, 
                            scale: 0.9,
                            transition: { 
                              duration: 0.4, 
                              ease: [0.4, 0, 0.2, 1],
                              opacity: { duration: 0.3 }
                            }
                          }}
                          transition={{ 
                            duration: 0.3, 
                            ease: "easeOut"
                          }}
                          layout
                          style={{ overflow: 'hidden' }}
                        >
                          <TimeSlotCard
                            slot={slot}
                            onConfirm={handleConfirmSlot}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
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
      </div>

      {/* Input Area */}
      <ChatInput onSend={handleSendMessage} />
    </div>
  );
}
