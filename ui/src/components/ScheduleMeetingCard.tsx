import { useState, useEffect } from 'react';
import { Users, Calendar, Clock, Search, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { motion } from 'motion/react';
import { getAllUsers, userToParticipant, Participant } from '../api/users';

interface ScheduleMeetingCardProps {
  onSchedule: (data: any) => void;
  selectedParticipants: string[];
  setSelectedParticipants: (participants: string[]) => void;
}


export function ScheduleMeetingCard({ onSchedule, selectedParticipants, setSelectedParticipants }: ScheduleMeetingCardProps) {
  const [dateRange, setDateRange] = useState('this-week');
  const [duration, setDuration] = useState('1h');
  const [isLoading, setIsLoading] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleFindSlot = () => {
    if (selectedParticipants.length === 0) return;
    
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSchedule({
        participants: selectedParticipants,
        dateRange,
        duration,
      });
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-2 border-emerald-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Calendar className="h-5 w-5 text-[#10B981]" />
            Schedule a Meeting
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Select participants, date range, and duration to find optimal slots
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            disabled={selectedParticipants.length === 0 || isLoading}
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
