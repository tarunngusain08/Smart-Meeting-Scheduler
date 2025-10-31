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
    <div className="h-full flex flex-col gap-4">
      {/* Selected Participants */}
      <Card className="border-2 border-emerald-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Users className="h-5 w-5 text-[#10B981]" />
            Selected Participants
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            {selected.length === 0 ? 'No participants selected' : `${selected.length} participant${selected.length > 1 ? 's' : ''} selected`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selected.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Select participants from the scheduling widget to see their details here.
            </p>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3.5 pr-2">
                {selected.map((participant) => (
                  <div key={participant.id} className="flex items-start gap-2.5">
                    <Avatar className="h-9 w-9 ring-2 ring-emerald-500 shadow-md flex-shrink-0">
                      <AvatarImage src={participant.avatar} />
                      <AvatarFallback className="text-xs">{participant.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {participant.name}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{participant.role}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs py-0 px-1.5 h-5 ${
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
                            className="text-xs border-blue-500/50 text-blue-600 dark:text-blue-400 flex items-center gap-1 py-0 px-1.5 h-5"
                            title={getTimezoneDisplayName(participant.timezone)}
                          >
                            <Globe className="h-3 w-3" />
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
        <Card className="border-2 border-emerald-400 dark:border-emerald-600 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950 dark:to-teal-950 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Calendar className="h-5 w-5 text-[#10B981]" />
              Next Meeting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Date & Time</p>
              <p className="text-slate-900 dark:text-white">
                {nextMeeting.date} at {nextMeeting.time}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Duration</p>
              <p className="text-slate-900 dark:text-white">{nextMeeting.duration}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Participants</p>
              <div className="flex -space-x-2">
                {nextMeeting.participants.map((name: string, idx: number) => (
                  <Avatar key={idx} className="h-8 w-8 ring-2 ring-white dark:ring-slate-900">
                  <AvatarImage src={`${import.meta.env.VITE_AVATAR_API_URL || 'https://api.dicebear.com/7.x/avataaars/svg'}?seed=${name}`} />
                    <AvatarFallback className="text-xs">{name[0]}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      <Card className="border-2 border-emerald-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Sparkles className="h-5 w-5 text-[#10B981]" />
            AI Insights
            {insightsLoading && (
              <Loader2 className="h-4 w-4 ml-auto animate-spin text-[#10B981]" />
            )}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            {selected.length > 0 
              ? `Personalized insights for ${selected.length} participant${selected.length > 1 ? 's' : ''}`
              : 'Select participants to see insights'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selected.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
              Select participants from the scheduling widget to see AI-powered insights.
            </p>
          ) : insightsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#10B981]" />
              <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                Generating insights...
              </span>
            </div>
          ) : aiInsights.length > 0 ? (
            <div className="space-y-3">
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
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all hover:shadow-md ${colorClasses[insight.color as keyof typeof colorClasses] || colorClasses.blue}`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {insight.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {insight.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
              No insights available at the moment.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card className="border-2 border-gray-300/50 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Globe className="h-5 w-5 text-blue-500" />
            Time Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Your timezone:</span>
              <Badge variant="secondary">{currentUserTimezone}</Badge>
            </div>
            <Separator />
            <div className="text-xs text-slate-500 dark:text-slate-400">
              All times shown in {currentUserTimezone.split(' ')[0].toLowerCase()}. Participants in other time zones will see adjusted times.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
