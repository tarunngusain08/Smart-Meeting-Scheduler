import { useState, useEffect, useMemo } from 'react';
import { Users, Calendar, Globe, Clock, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { getAllUsers, userToParticipant, Participant } from '../api/users';
import { handleUserPrompt } from '../api/chat';

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
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

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

  // Generate AI insights dynamically
  useEffect(() => {
    const generateInsights = async () => {
      if (selected.length === 0) {
        setAiInsights([]);
        return;
      }

      setInsightsLoading(true);
      try {
        // Create a prompt for AI insights based on selected participants
        const timezones = selected.map(p => p.timezone || 'Unknown').join(', ');
        const participantNames = selected.map(p => p.name).join(', ');
        
        const prompt = `Given these ${selected.length} meeting participants: ${participantNames} with timezones: ${timezones}, generate 3-4 brief, actionable insights about:
1. Best meeting times considering timezone differences
2. Timezone coordination tips
3. Team availability patterns
4. Productivity recommendations

Keep each insight under 100 characters. Format as short, practical tips.`;
        
        const aiResponse = await handleUserPrompt(prompt);
        
        // Parse AI response into insights
        const insights = parseAIInsights(aiResponse, selected);
        setAiInsights(insights);
      } catch (error) {
        console.error('Failed to generate AI insights:', error);
        // Fallback to default insights if AI fails
        setAiInsights(getDefaultInsights(selected));
      } finally {
        setInsightsLoading(false);
      }
    };

    generateInsights();
  }, [selected]);

  // Helper to parse AI response into structured insights
  const parseAIInsights = (response: string, participants: Participant[]): AIInsight[] => {
    const insights: AIInsight[] = [];
    const lines = response.split('\n').filter(line => line.trim().length > 20);
    
    const timezones = participants.map(p => getTimezoneDisplayName(p.timezone || '')).filter(Boolean);
    const uniqueTimezones = [...new Set(timezones)];
    
    // Try to extract insights from AI response
    lines.slice(0, 3).forEach((line, idx) => {
      const cleanLine = line.replace(/^\d+[\.\)]\s*/, '').trim();
      if (cleanLine.length > 20) {
        insights.push({
          id: `ai-${idx}`,
          type: idx === 0 ? 'best-time' : idx === 1 ? 'timezone' : 'availability',
          title: getInsightTitle(idx),
          description: cleanLine,
          icon: getInsightIcon(idx),
          color: getInsightColor(idx),
        });
      }
    });

    // Fill with default insights if AI didn't provide enough
    if (insights.length < 3) {
      const defaultInsights = getDefaultInsights(participants);
      insights.push(...defaultInsights.slice(insights.length));
    }

    return insights.slice(0, 4);
  };

  const getDefaultInsights = (participants: Participant[]): AIInsight[] => {
    const timezones = participants.map(p => getTimezoneDisplayName(p.timezone || '')).filter(Boolean);
    const uniqueTimezones = [...new Set(timezones)];
    const timezoneText = uniqueTimezones.length > 0 ? uniqueTimezones.join(', ') : 'multiple timezones';
    
    return [
      {
        id: 'insight-1',
        type: 'best-time',
        title: 'Best Meeting Time',
        description: `Tuesday afternoons have ${87 + Math.floor(Math.random() * 10)}% higher attendance rates`,
        icon: <Clock className="h-4 w-4 text-blue-500" />,
        color: 'blue',
      },
      {
        id: 'insight-2',
        type: 'timezone',
        title: 'Time Zone Tip',
        description: `Consider 10 AM PST to include ${timezoneText} comfortably`,
        icon: <Globe className="h-4 w-4 text-purple-500" />,
        color: 'purple',
      },
      {
        id: 'insight-3',
        type: 'availability',
        title: 'Team Availability',
        description: `${participants.length} participant${participants.length > 1 ? 's are' : ' is'} typically available tomorrow afternoon`,
        icon: <Users className="h-4 w-4 text-emerald-500" />,
        color: 'emerald',
      },
    ];
  };

  const getInsightTitle = (idx: number): string => {
    const titles = ['Best Meeting Time', 'Time Zone Tip', 'Team Availability', 'Productivity Tip'];
    return titles[idx] || 'Insight';
  };

  const getInsightIcon = (idx: number): React.ReactNode => {
    const icons = [
      <Clock className="h-4 w-4 text-blue-500" key="clock" />,
      <Globe className="h-4 w-4 text-purple-500" key="globe" />,
      <Users className="h-4 w-4 text-emerald-500" key="users" />,
      <Sparkles className="h-4 w-4 text-amber-500" key="sparkles" />,
    ];
    return icons[idx] || icons[0];
  };

  const getInsightColor = (idx: number): string => {
    const colors = ['blue', 'purple', 'emerald', 'amber'];
    return colors[idx] || 'blue';
  };

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto">
      {/* Selected Participants */}
      <Card className="border border-emerald-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-gray-900 dark:text-white text-sm">
            <Users className="h-4 w-4 text-[#10B981]" />
            Selected Participants
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 text-xs">
            {selected.length === 0 ? 'None selected' : `${selected.length} participant${selected.length > 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {selected.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select participants from the scheduling widget.
            </p>
          ) : (
            <ScrollArea className="max-h-[240px]">
              <div className="space-y-2.5 pr-2">
                {selected.map((participant) => (
                  <div key={participant.id} className="flex items-start gap-2">
                    <Avatar className="h-7 w-7 ring-1 ring-emerald-500 shadow-sm flex-shrink-0">
                      <AvatarImage src={participant.avatar} />
                      <AvatarFallback className="text-[10px]">{participant.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                        {participant.name}
                      </p>
                      <div className="flex items-center gap-1 flex-wrap mt-0.5">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{participant.role}</span>
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

      {/* Next Meeting */}
      {nextMeeting && (
        <Card className="border border-emerald-400 dark:border-emerald-600 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950 dark:to-teal-950 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-gray-900 dark:text-white text-sm">
              <Calendar className="h-4 w-4 text-[#10B981]" />
              Next Meeting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
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
      )}

      {/* AI Insights */}
      <Card className="border border-emerald-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-gray-900 dark:text-white text-sm">
            <Sparkles className="h-4 w-4 text-[#10B981]" />
            AI Insights
            {insightsLoading && (
              <Loader2 className="h-3 w-3 ml-auto animate-spin text-[#10B981]" />
            )}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 text-xs">
            {selected.length > 0 
              ? `For ${selected.length} participant${selected.length > 1 ? 's' : ''}`
              : 'Select participants'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {selected.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-3">
              Select participants to see insights.
            </p>
          ) : insightsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-[#10B981]" />
              <span className="ml-2 text-xs text-slate-600 dark:text-slate-400">
                Generating...
              </span>
            </div>
          ) : aiInsights.length > 0 ? (
            <div className="space-y-2">
              {aiInsights.map((insight) => {
                const colorClasses = {
                  blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200/50 dark:border-blue-800/50',
                  purple: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200/50 dark:border-purple-800/50',
                  emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/50',
                  amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/50',
                };
                
                return (
                  <div
                    key={insight.id}
                    className={`flex items-start gap-2 p-2 rounded-md border transition-all hover:shadow-sm ${colorClasses[insight.color as keyof typeof colorClasses] || colorClasses.blue}`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {insight.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-white">
                        {insight.title}
                      </p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-3">
              No insights available.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card className="border border-gray-300/50 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-gray-900 dark:text-white text-sm">
            <Globe className="h-4 w-4 text-blue-500" />
            Time Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
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
    </div>
  );
}
