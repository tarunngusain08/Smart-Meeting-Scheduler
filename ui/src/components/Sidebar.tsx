import { useState, useEffect, useMemo } from 'react';
import { Users, Calendar, Globe, Clock, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { getAllUsers, userToParticipant, Participant } from '../api/users';
import { motion } from 'motion/react';

interface SidebarProps {
  selectedParticipants: string[];
  nextMeeting: any;
}

// Helper function to get timezone display name
const getTimezoneDisplayName = (timezone?: string): string => {
  if (!timezone) return 'Unknown';
  
  const timezoneMap: Record<string, string> = {
    'America/Los_Angeles': 'Pacific Time (PT)',
    'America/New_York': 'Eastern Time (ET)',
    'Europe/London': 'Greenwich Mean Time (GMT)',
    'Asia/Kolkata': 'India Standard Time (IST)',
    'Asia/Seoul': 'Korea Standard Time (KST)',
    'Pacific Standard Time': 'Pacific Time (PT)',
    'Eastern Standard Time': 'Eastern Time (ET)',
    'PST': 'Pacific Time (PT)',
    'EST': 'Eastern Time (ET)',
    'IST': 'India Standard Time (IST)',
    'GMT': 'Greenwich Mean Time (GMT)',
  };
  
  // Check if it's already a display name or matches a key
  return timezoneMap[timezone] || timezoneMap[timezone.toUpperCase()] || timezone;
};

// Helper function to get abbreviated timezone (short form)
const getTimezoneAbbreviation = (timezone?: string): string => {
  if (!timezone) return 'TZ';
  
  const abbreviationMap: Record<string, string> = {
    'America/Los_Angeles': 'PT',
    'America/New_York': 'ET',
    'Europe/London': 'GMT',
    'Asia/Kolkata': 'IST',
    'Asia/Seoul': 'KST',
    'Pacific Standard Time': 'PT',
    'Eastern Standard Time': 'ET',
    'PST': 'PT',
    'EST': 'ET',
    'IST': 'IST',
    'GMT': 'GMT',
    'Pacific Time (PT)': 'PT',
    'Eastern Time (ET)': 'ET',
    'India Standard Time (IST)': 'IST',
    'Greenwich Mean Time (GMT)': 'GMT',
    'Korea Standard Time (KST)': 'KST',
  };
  
  // Extract abbreviation from display name if it contains parentheses
  const match = timezone.match(/\(([A-Z]+)\)/);
  if (match) return match[1];
  
  // Check direct mapping
  return abbreviationMap[timezone] || abbreviationMap[timezone.toUpperCase()] || timezone.slice(0, 3).toUpperCase();
};

interface AIInsight {
  id: string;
  type: 'best-time' | 'timezone' | 'availability' | 'productivity';
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export function Sidebar({ selectedParticipants, nextMeeting }: SidebarProps) {
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [currentUserTimezone, setCurrentUserTimezone] = useState<string>('Pacific Time (PT)');
  // Static AI Insights - no dynamic generation
  const staticInsights: AIInsight[] = [
    {
      id: 'insight-1',
      type: 'best-time',
      title: 'Best Meeting Time',
      description: 'Tuesday and Wednesday afternoons typically have 85% higher attendance rates',
      icon: <Clock className="h-4 w-4 text-blue-500" />,
      color: 'blue',
    },
    {
      id: 'insight-2',
      type: 'timezone',
      title: 'Time Zone Tip',
      description: 'Schedule between 10 AM - 2 PM PT to accommodate most time zones comfortably',
      icon: <Globe className="h-4 w-4 text-purple-500" />,
      color: 'purple',
    },
    {
      id: 'insight-3',
      type: 'availability',
      title: 'Team Availability',
      description: 'Morning slots (9-11 AM) have better availability for cross-timezone teams',
      icon: <Users className="h-4 w-4 text-emerald-500" />,
      color: 'emerald',
    },
    {
      id: 'insight-4',
      type: 'productivity',
      title: 'Productivity Tip',
      description: 'Keep meetings under 50 minutes to allow buffer time between sessions',
      icon: <Sparkles className="h-4 w-4 text-amber-500" />,
      color: 'amber',
    },
  ];

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await getAllUsers();
        const participants = users.map(userToParticipant);
        setAvailableParticipants(participants);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/graph/user/current');
        if (response.ok) {
          const user = await response.json();
          if (user.timezone) {
            setCurrentUserTimezone(getTimezoneDisplayName(user.timezone));
          }
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };

    fetchUsers();
    fetchCurrentUser();
  }, []);

  const selected = useMemo(
    () => availableParticipants.filter((p) => selectedParticipants.includes(p.name)),
    [availableParticipants, selectedParticipants]
  );

  return (
    <div className="h-full w-full overflow-y-auto" style={{ maxWidth: '100%' }}>
      <div className="space-y-3 w-full" style={{ maxWidth: '100%' }}>
      {/* Selected Participants - Fixed Height */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
      <Card className="border border-emerald-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-all duration-300 w-full h-[280px] flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="flex items-center gap-1.5 text-gray-900 dark:text-white text-sm">
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              <Users className="h-4 w-4 text-[#10B981]" />
            </motion.div>
            Selected Participants
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 text-xs">
            {selected.length === 0 ? 'None selected' : `${selected.length} participant${selected.length > 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 flex-1 min-h-0 overflow-hidden">
          {selected.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                Select participants from the scheduling widget.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full w-full">
              <div className="space-y-2.5 pr-2 w-full">
                {selected.map((participant) => (
                  <div key={participant.id} className="flex items-start gap-2 w-full min-w-0">
                    <Avatar className="h-7 w-7 ring-1 ring-emerald-500 shadow-sm flex-shrink-0">
                      <AvatarImage src={participant.avatar} />
                      <AvatarFallback className="text-[10px]">{participant.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                        {participant.name}
                      </p>
                      <div className="flex items-center gap-1 flex-wrap mt-0.5 max-w-full">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{participant.role}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-1 h-4 ${
                            participant.status === 'available'
                              ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                              : participant.status === 'busy'
                              ? 'border-red-500/50 text-red-600 dark:text-red-400'
                              : 'border-amber-500/50 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {participant.status}
                        </Badge>
                        {participant.timezone && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-blue-500/50 text-blue-600 dark:text-blue-400 flex items-center gap-0.5 py-0 px-1 h-4"
                            title={getTimezoneDisplayName(participant.timezone)}
                          >
                            <Globe className="h-2.5 w-2.5" />
                            {getTimezoneAbbreviation(participant.timezone)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      </motion.div>

      {/* Next Meeting - Fixed Height */}
      {nextMeeting && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.4, 0, 0.2, 1] }}
        >
        <Card className="border border-emerald-400 dark:border-emerald-600 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950 dark:to-teal-950 shadow-lg hover:shadow-xl transition-all duration-300 w-full h-[200px] flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="flex items-center gap-1.5 text-gray-900 dark:text-white text-sm">
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                transition={{ duration: 0.2 }}
              >
                <Calendar className="h-4 w-4 text-[#10B981]" />
              </motion.div>
              Next Meeting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-2 flex-1 min-h-0 overflow-hidden">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Date & Time</p>
              <p className="text-xs text-slate-900 dark:text-white">
                {nextMeeting.date} at {nextMeeting.time}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Duration</p>
              <p className="text-xs text-slate-900 dark:text-white">{nextMeeting.duration}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Participants</p>
              <div className="flex -space-x-1.5">
                {nextMeeting.participants.map((name: string, idx: number) => (
                  <Avatar key={idx} className="h-6 w-6 ring-1 ring-white dark:ring-slate-900">
                  <AvatarImage src={`${import.meta.env.VITE_AVATAR_API_URL || 'https://api.dicebear.com/7.x/avataaars/svg'}?seed=${name}`} />
                    <AvatarFallback className="text-[10px]">{name[0]}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      )}

      {/* AI Insights - Static Content */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: nextMeeting ? 0.1 : 0.05, ease: [0.4, 0, 0.2, 1] }}
      >
      <Card className="border border-emerald-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-all duration-300 w-full h-[320px] flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="flex items-center gap-1.5 text-gray-900 dark:text-white text-sm">
            <motion.div
              animate={{ 
                scale: [1, 1.15, 1],
                rotate: [0, 8, -8, 0]
              }}
              transition={{ 
                duration: 2.5,
                repeat: Infinity,
                repeatDelay: 4
              }}
            >
              <Sparkles className="h-4 w-4 text-[#10B981]" />
            </motion.div>
            AI Insights
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 text-xs">
            Smart scheduling tips
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-2 w-full">
            {staticInsights.map((insight, index) => {
              const colorClasses = {
                blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200/50 dark:border-blue-800/50',
                purple: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200/50 dark:border-purple-800/50',
                emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/50',
                amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/50',
              };
              
              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: (nextMeeting ? 0.15 : 0.1) + index * 0.05 }}
                  whileHover={{ scale: 1.02, x: 3 }}
                  className={`flex items-start gap-2 p-2 rounded-md border transition-all hover:shadow-md w-full min-w-0 ${colorClasses[insight.color as keyof typeof colorClasses] || colorClasses.blue}`}
                >
                  <motion.div 
                    className="mt-0.5 flex-shrink-0"
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    {insight.icon}
                  </motion.div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-xs font-medium text-slate-900 dark:text-white">
                      {insight.title}
                    </p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed whitespace-normal">
                      {insight.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Timezone - Fixed Height */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: nextMeeting ? 0.15 : 0.1, ease: [0.4, 0, 0.2, 1] }}
      >
      <Card className="border border-gray-300/50 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 shadow-md hover:shadow-lg transition-all duration-300 w-full h-[140px] flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="flex items-center gap-1.5 text-gray-900 dark:text-white text-sm">
            <motion.div
              whileHover={{ scale: 1.2, rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              <Globe className="h-4 w-4 text-blue-500" />
            </motion.div>
            Time Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 flex-1 min-h-0 overflow-hidden">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600 dark:text-slate-400">Your timezone:</span>
              <Badge variant="secondary" className="text-[10px] h-5">{currentUserTimezone}</Badge>
            </div>
            <Separator />
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              All times shown in {currentUserTimezone.split(' ')[0].toLowerCase()}. Other zones see adjusted times.
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>
      </div>
    </div>
  );
}
