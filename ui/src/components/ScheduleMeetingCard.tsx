import { useState, useEffect } from 'react';
import { Users, Calendar, Clock, Search, Loader2, AlertCircle, FileText, Star, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { motion } from 'motion/react';
import { getAllUsers, userToParticipant, Participant } from '../api/users';
import { smartScheduleMeeting } from '../api/calendarNew';

interface ScheduleMeetingCardProps {
  onSchedule: (data: any) => void;
  selectedParticipants: string[];
  setSelectedParticipants: (participants: string[]) => void;
  isActive?: boolean;
  onClose?: () => void;
}


export function ScheduleMeetingCard({ onSchedule, selectedParticipants, setSelectedParticipants, isActive = true, onClose }: ScheduleMeetingCardProps) {
  const [dateRange, setDateRange] = useState('this-week');
  const [duration, setDuration] = useState('1h');
  const [isLoading, setIsLoading] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New fields for meeting context
  const [meetingHeadline, setMeetingHeadline] = useState('');
  const [agenda, setAgenda] = useState('');
  const [priorityAttendees, setPriorityAttendees] = useState<string[]>([]);
  const [showPriorityAttendees, setShowPriorityAttendees] = useState(false);
  const [prioritySearchQuery, setPrioritySearchQuery] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        setUsersError(null);
        const users = await getAllUsers();
        const participants = users.map(userToParticipant);
        setAvailableParticipants(participants);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setUsersError('Failed to load users. Please try again.');
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  const toggleParticipant = (name: string) => {
    if (selectedParticipants.includes(name)) {
      setSelectedParticipants(selectedParticipants.filter((p) => p !== name));
    } else {
      setSelectedParticipants([...selectedParticipants, name]);
    }
  };

  const filteredParticipants = availableParticipants.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPriorityParticipants = availableParticipants.filter((p) =>
    p.name.toLowerCase().includes(prioritySearchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(prioritySearchQuery.toLowerCase())
  );

  const togglePriorityAttendee = (name: string) => {
    if (priorityAttendees.includes(name)) {
      setPriorityAttendees(priorityAttendees.filter((p) => p !== name));
    } else {
      setPriorityAttendees([...priorityAttendees, name]);
    }
  };

  const handleFindSlot = async () => {
    if (selectedParticipants.length === 0) return;
    if (!meetingHeadline.trim()) {
      // Show error if headline is missing
      return;
    }

    // Calculate startTime and endTime based on dateRange
    const now = new Date();
    let startTime: Date;
    let endTime: Date;

    switch (dateRange) {
      case 'today':
        // Today from 00:00 to 23:59
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;

      case 'this-week':
        // From now to 7 days from now (default behavior)
        startTime = new Date(now);
        endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;

      case 'next-week':
        // Next Monday to following Sunday
        const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysUntilNextMonday = currentDay === 0 ? 1 : (8 - currentDay); // If Sunday, next Monday is tomorrow
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilNextMonday, 0, 0, 0, 0);
        endTime = new Date(startTime.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);
        break;

      default:
        // Default to this-week
        startTime = new Date(now);
        endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // Convert duration string to minutes
    const durationInMinutes = duration === '30m' ? 30 : 
                              duration === '1h' ? 60 : 
                              duration === '1.5h' ? 90 : 
                              duration === '2h' ? 120 : 60;

    // Get attendee emails from selected participants
    const attendeeEmails = selectedParticipants
      .map(name => {
        const participant = availableParticipants.find(p => p.name === name);
        return participant?.email;
      })
      .filter((email): email is string => email !== undefined);

    setIsLoading(true);
    
    try {
      // Call the smartScheduleMeeting function
      const result = await smartScheduleMeeting(
        meetingHeadline.trim(),
        attendeeEmails,
        durationInMinutes,
        { start: startTime, end: endTime },
        undefined, // organizer - will use authenticated user
        {
          isOnline: false,
          description: agenda.trim() || undefined,
          location: undefined,
        }
      );

      // Pass the result to the parent component
      onSchedule({
        participants: selectedParticipants,
        duration,
        startDate: startTime,
        endDate: endTime,
        maxSuggestions: 5,
        meetingHeadline: meetingHeadline.trim(),
        agenda: agenda.trim() || undefined,
        priorityAttendees: priorityAttendees.length > 0 ? priorityAttendees : undefined,
        // Include the API response data
        suggestions: result.suggestions,
        message: result.message,
      });
    } catch (error) {
      console.error('Failed to schedule meeting:', error);
      // You can add error handling UI here
      alert(`Failed to schedule meeting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isActive) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="border-2 border-emerald-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Calendar className="h-5 w-5 text-[#10B981]" />
                Schedule a Meeting
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Select participants, date range, and duration to find optimal slots
              </CardDescription>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Meeting Headline - Required */}
          <div>
            <Label className="flex items-center gap-2 mb-2 text-gray-900 dark:text-white font-medium">
              <FileText className="h-4 w-4" />
              Meeting Headline <span className="text-red-500">*</span>
            </Label>
            <Input
              value={meetingHeadline}
              onChange={(e) => setMeetingHeadline(e.target.value)}
              placeholder="e.g., Team Standup, Sprint Planning"
              className="w-full border-2 border-gray-300/60 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              required
            />
          </div>

          {/* Agenda/Description - Optional */}
          <div>
            <Label className="flex items-center gap-2 mb-2 text-gray-900 dark:text-white font-medium">
              <FileText className="h-4 w-4" />
              Agenda/Description <span className="text-gray-500 text-xs">(optional)</span>
            </Label>
            <Textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="Add meeting agenda, discussion topics, or description..."
              className="w-full min-h-[80px] resize-none border-2 border-gray-300/60 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
          </div>
          {/* Participants */}
          <div>
            <label className="flex items-center gap-2 mb-2 text-gray-900 dark:text-white font-medium">
              <Users className="h-4 w-4" />
              Participants
            </label>
            <div className="relative">
              <Button
                variant="outline"
                className="w-full justify-start text-left h-auto min-h-[44px] border-2 border-gray-300/60 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
                onClick={() => setShowParticipants(!showParticipants)}
              >
                {selectedParticipants.length === 0 ? (
                  <span className="text-gray-500 dark:text-gray-400">Select participants...</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedParticipants.map((name) => (
                      <Badge key={name} variant="secondary" className="bg-[#10B981] text-white border border-emerald-600">
                        {name}
                      </Badge>
                    ))}
                  </div>
                )}
              </Button>

              {showParticipants && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute z-10 w-full mt-2 p-2 rounded-lg border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-2xl"
                >
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search participants..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-md border-2 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {isLoadingUsers ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading users...</span>
                      </div>
                    ) : usersError ? (
                      <div className="flex items-center gap-2 p-3 text-red-600 dark:text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{usersError}</span>
                      </div>
                    ) : filteredParticipants.length === 0 ? (
                      <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                        No users found
                      </div>
                    ) : (
                      filteredParticipants.map((participant) => (
                      <button
                        key={participant.id}
                        onClick={() => toggleParticipant(participant.name)}
                        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={participant.avatar} />
                          <AvatarFallback>{participant.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <p className="text-gray-900 dark:text-white font-medium">{participant.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{participant.role}</p>
                        </div>
                        {selectedParticipants.includes(participant.name) && (
                          <div className="h-5 w-5 rounded-full bg-[#10B981] flex items-center justify-center shadow-md">
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    )))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Priority Attendees - Optional */}
          <div>
            <Label className="flex items-center gap-2 mb-2 text-gray-900 dark:text-white font-medium">
              <Star className="h-4 w-4" />
              Priority Attendees <span className="text-gray-500 text-xs">(optional)</span>
            </Label>
            <div className="relative">
              <Button
                variant="outline"
                className="w-full justify-start text-left h-auto min-h-[44px] border-2 border-gray-300/60 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
                onClick={() => setShowPriorityAttendees(!showPriorityAttendees)}
              >
                {priorityAttendees.length === 0 ? (
                  <span className="text-gray-500 dark:text-gray-400">Select priority attendees...</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {priorityAttendees.map((name) => (
                      <Badge key={name} className="!bg-amber-500 !text-white border border-amber-600">
                        <Star className="h-3 w-3 mr-1" />
                        {name}
                      </Badge>
                    ))}
                  </div>
                )}
              </Button>

              {showPriorityAttendees && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute z-10 w-full mt-2 p-2 rounded-lg border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-2xl"
                >
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search participants..."
                      value={prioritySearchQuery}
                      onChange={(e) => setPrioritySearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-md border-2 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {isLoadingUsers ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading users...</span>
                      </div>
                    ) : usersError ? (
                      <div className="flex items-center gap-2 p-3 text-red-600 dark:text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{usersError}</span>
                      </div>
                    ) : filteredPriorityParticipants.length === 0 ? (
                      <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                        No users found
                      </div>
                    ) : (
                      filteredPriorityParticipants.map((participant) => (
                        <button
                          key={participant.id}
                          onClick={() => togglePriorityAttendee(participant.name)}
                          className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={participant.avatar} />
                            <AvatarFallback>{participant.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left">
                            <p className="text-gray-900 dark:text-white font-medium">{participant.name}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{participant.role}</p>
                          </div>
                          {priorityAttendees.includes(participant.name) && (
                            <div className="h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
                              <Star className="h-3 w-3 text-white fill-white" />
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="flex items-center gap-2 mb-2 text-gray-900 dark:text-white font-medium">
              <Calendar className="h-4 w-4" />
              Date Range
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Today', 'This Week', 'Next Week'].map((range) => (
                <Button
                  key={range}
                  variant={dateRange === range.toLowerCase().replace(' ', '-') ? 'default' : 'outline'}
                  onClick={() => setDateRange(range.toLowerCase().replace(' ', '-'))}
                  className={
                    dateRange === range.toLowerCase().replace(' ', '-')
                      ? 'bg-[#10B981] hover:bg-[#059669] text-white shadow-md'
                      : 'border-2 border-emerald-200 dark:border-slate-600 hover:bg-emerald-50 dark:hover:bg-slate-700'
                  }
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="flex items-center gap-2 mb-2 text-gray-900 dark:text-white font-medium">
              <Clock className="h-4 w-4" />
              Duration
            </label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30m">30 minutes</SelectItem>
                <SelectItem value="1h">1 hour</SelectItem>
                <SelectItem value="1.5h">1.5 hours</SelectItem>
                <SelectItem value="2h">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleFindSlot}
            disabled={selectedParticipants.length === 0 || isLoading || !meetingHeadline.trim()}
            className="w-full bg-[#10B981] hover:bg-[#059669] text-white shadow-xl shadow-emerald-500/50 disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finding Optimal Slots...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Find Optimal Slot
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
