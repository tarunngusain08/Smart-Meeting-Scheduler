import { Calendar, Clock, Sparkles, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { motion } from 'motion/react';

interface LeftSidebarProps {
  onQuickAction?: (action: string) => void;
  onScheduleMeeting?: () => void;
}

export function LeftSidebar({ onQuickAction, onScheduleMeeting }: LeftSidebarProps) {
  const handleQuickAction = (action: string) => {
    if (onQuickAction) {
      onQuickAction(action);
    }
  };

  const handleScheduleMeeting = () => {
    if (onScheduleMeeting) {
      onScheduleMeeting();
    } else {
      // Fallback: trigger via window handlers
      if ((window as any).__chatInterfaceHandlers) {
        (window as any).__chatInterfaceHandlers.triggerScheduleMeeting();
      }
    }
  };

  const quickActions = [
    {
      id: 'check-today',
      label: 'Check Today',
      icon: <Calendar className="h-4 w-4" />,
      description: 'View availability for today',
      color: 'blue',
      action: 'check-today',
    },
    {
      id: 'check-tomorrow',
      label: 'Check Tomorrow',
      icon: <Calendar className="h-4 w-4" />,
      description: 'View availability for tomorrow',
      color: 'blue',
      action: 'check-tomorrow',
    },
    {
      id: 'check-this-week',
      label: 'This Week',
      icon: <Clock className="h-4 w-4" />,
      description: 'View availability this week',
      color: 'emerald',
      action: 'check-this-week',
    },
    {
      id: 'check-next-week',
      label: 'Next Week',
      icon: <Clock className="h-4 w-4" />,
      description: 'View availability next week',
      color: 'emerald',
      action: 'check-next-week',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
    purple: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300',
  };

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto">
      {/* Quick Actions */}
      <Card className="border border-emerald-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-gray-900 dark:text-white text-sm">
            <Zap className="h-4 w-4 text-[#10B981]" />
            Quick Actions
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 text-xs">
            Check availability quickly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 pt-2">
          {quickActions.map((action) => (
            <motion.div
              key={action.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="outline"
                onClick={() => handleQuickAction(action.action)}
                className={`w-full justify-start h-auto py-2 px-3 border transition-all ${colorClasses[action.color as keyof typeof colorClasses] || colorClasses.blue}`}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="flex-shrink-0">{action.icon}</div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-xs">{action.label}</p>
                    <p className="text-[10px] opacity-80">{action.description}</p>
                  </div>
                </div>
              </Button>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Schedule Meeting */}
      <Card className="border border-emerald-400 dark:border-emerald-600 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950 dark:to-teal-950 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-gray-900 dark:text-white text-sm">
            <Sparkles className="h-4 w-4 text-[#10B981]" />
            Schedule Meeting
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 text-xs">
            Start scheduling a meeting
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={handleScheduleMeeting}
              className="w-full h-auto py-3 px-3 bg-[#10B981] hover:bg-[#059669] text-white shadow-lg shadow-emerald-500/50 transition-all"
            >
              <div className="flex items-center gap-2 w-full">
                <Calendar className="h-4 w-4" />
                <div className="flex-1 text-left">
                  <p className="font-semibold text-xs">Schedule a Meeting</p>
                  <p className="text-[10px] opacity-90">Create a new meeting</p>
                </div>
              </div>
            </Button>
          </motion.div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="border border-gray-300/50 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-gray-900 dark:text-white text-xs">
            <Sparkles className="h-3 w-3 text-blue-500" />
            Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-1.5 text-[10px] text-slate-600 dark:text-slate-400">
            <p>• Quick actions check availability</p>
            <p>• Select participants for insights</p>
            <p>• Schedule from chat interface</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

