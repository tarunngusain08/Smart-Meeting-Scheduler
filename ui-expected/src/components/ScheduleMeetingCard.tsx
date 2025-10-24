import { useState } from 'react';
import { Users, Calendar, Clock, Search, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { motion } from 'motion/react';

interface ScheduleMeetingCardProps {
  onSchedule: (data: any) => void;
  selectedParticipants: string[];
  setSelectedParticipants: (participants: string[]) => void;
}

const availableParticipants = [
  { id: '1', name: 'Sarah Johnson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', role: 'Product Manager' },
  { id: '2', name: 'Mike Chen', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', role: 'Designer' },
  { id: '3', name: 'Alex Rivera', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', role: 'Engineer' },
  { id: '4', name: 'Emma Davis', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma', role: 'Marketing' },
  { id: '5', name: 'James Wilson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James', role: 'Sales' },
];

export function ScheduleMeetingCard({ onSchedule, selectedParticipants, setSelectedParticipants }: ScheduleMeetingCardProps) {
  const [dateRange, setDateRange] = useState('this-week');
  const [duration, setDuration] = useState('1h');
  const [isLoading, setIsLoading] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  const toggleParticipant = (name: string) => {
    if (selectedParticipants.includes(name)) {
      setSelectedParticipants(selectedParticipants.filter((p) => p !== name));
    } else {
      setSelectedParticipants([...selectedParticipants, name]);
    }
  };

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
      <Card className="border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-500" />
            Schedule a Meeting
          </CardTitle>
          <CardDescription>
            Select participants, date range, and duration to find optimal slots
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Participants */}
          <div>
            <label className="flex items-center gap-2 mb-2 text-slate-700 dark:text-slate-200">
              <Users className="h-4 w-4" />
              Participants
            </label>
            <div className="relative">
              <Button
                variant="outline"
                className="w-full justify-start text-left h-auto min-h-[44px] hover:bg-slate-50 dark:hover:bg-slate-700/50"
                onClick={() => setShowParticipants(!showParticipants)}
              >
                {selectedParticipants.length === 0 ? (
                  <span className="text-slate-500">Select participants...</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedParticipants.map((name) => (
                      <Badge key={name} variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
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
                  className="absolute z-10 w-full mt-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl"
                >
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search participants..."
                      className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {availableParticipants.map((participant) => (
                      <button
                        key={participant.id}
                        onClick={() => toggleParticipant(participant.name)}
                        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={participant.avatar} />
                          <AvatarFallback>{participant.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <p className="text-slate-900 dark:text-slate-100">{participant.name}</p>
                          <p className="text-xs text-slate-500">{participant.role}</p>
                        </div>
                        {selectedParticipants.includes(participant.name) && (
                          <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="flex items-center gap-2 mb-2 text-slate-700 dark:text-slate-200">
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
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                      : ''
                  }
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="flex items-center gap-2 mb-2 text-slate-700 dark:text-slate-200">
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
            className="w-full bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/30"
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
