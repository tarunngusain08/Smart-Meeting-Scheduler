import { Users, Calendar, Globe, Clock, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';

interface SidebarProps {
  selectedParticipants: string[];
  nextMeeting: any;
}

const availableParticipants = [
  { id: '1', name: 'Sarah Johnson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', role: 'Product Manager', timezone: 'PST', status: 'available' },
  { id: '2', name: 'Mike Chen', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', role: 'Designer', timezone: 'EST', status: 'busy' },
  { id: '3', name: 'Alex Rivera', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', role: 'Engineer', timezone: 'PST', status: 'available' },
  { id: '4', name: 'Emma Davis', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma', role: 'Marketing', timezone: 'CST', status: 'available' },
  { id: '5', name: 'James Wilson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James', role: 'Sales', timezone: 'EST', status: 'away' },
];

export function Sidebar({ selectedParticipants, nextMeeting }: SidebarProps) {
  const selected = availableParticipants.filter((p) => selectedParticipants.includes(p.name));

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Selected Participants */}
      <Card className="border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" />
            Selected Participants
          </CardTitle>
          <CardDescription>
            {selected.length === 0 ? 'No participants selected' : `${selected.length} participant${selected.length > 1 ? 's' : ''} selected`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selected.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Select participants from the scheduling widget to see their details here.
            </p>
          ) : (
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-3">
                {selected.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-emerald-500/20">
                      <AvatarImage src={participant.avatar} />
                      <AvatarFallback>{participant.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 dark:text-white truncate">
                        {participant.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-500">{participant.role}</p>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            participant.status === 'available'
                              ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                              : participant.status === 'busy'
                              ? 'border-red-500/50 text-red-600 dark:text-red-400'
                              : 'border-amber-500/50 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {participant.status}
                        </Badge>
                      </div>
                    </div>
                    <Globe className="h-4 w-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Next Meeting */}
      {nextMeeting && (
        <Card className="border-emerald-200/50 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/50 dark:to-teal-950/50 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-500" />
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
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`} />
                    <AvatarFallback className="text-xs">{name[0]}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      <Card className="border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50">
              <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-slate-900 dark:text-white">Best Meeting Time</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Tuesday afternoons have 87% higher attendance rates
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/50">
              <Globe className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-slate-900 dark:text-white">Time Zone Tip</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Consider 10 AM PST to include all time zones comfortably
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
              <Users className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-slate-900 dark:text-white">Team Availability</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  3 participants are typically available tomorrow afternoon
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card className="border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            Time Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Your timezone:</span>
              <Badge variant="secondary">Pacific Time (PT)</Badge>
            </div>
            <Separator />
            <div className="text-xs text-slate-500 dark:text-slate-400">
              All times shown in PT. Participants in other time zones will see adjusted times.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
