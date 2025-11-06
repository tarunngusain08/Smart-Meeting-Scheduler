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
    <div className="h-full w-full overflow-y-auto">
      <div className="space-y-3 w-full">
      {/* Quick Actions - Fixed Height */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <Card className="border border-emerald-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-all duration-300 w-full h-[320px] flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="flex items-center gap-1.5 text-gray-900 dark:text-white text-sm">
              <motion.div
                whileHover={{ rotate: 15 }}
                transition={{ duration: 0.2 }}
              >
                <Zap className="h-4 w-4 text-[#10B981]" />
              </motion.div>
              Quick Actions
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 text-xs">
              Check availability quickly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-2 flex-1 min-h-0 overflow-y-auto">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  onClick={() => handleQuickAction(action.action)}
                  className={`w-full justify-start h-auto py-2 px-3 border transition-all duration-200 hover:shadow-md ${colorClasses[action.color as keyof typeof colorClasses] || colorClasses.blue}`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <motion.div 
                      className="flex-shrink-0"
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {action.icon}
                    </motion.div>
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
      </motion.div>

      {/* Schedule Meeting - Fixed Height */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
      >
        <Card className="border border-emerald-400 dark:border-emerald-600 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950 dark:to-teal-950 shadow-lg hover:shadow-xl transition-all duration-300 w-full h-[160px] flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="flex items-center gap-1.5 text-gray-900 dark:text-white text-sm">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3
                }}
              >
                <Sparkles className="h-4 w-4 text-[#10B981]" />
              </motion.div>
              Schedule Meeting
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 text-xs">
              Start scheduling a meeting
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 flex-1 min-h-0 flex items-center justify-center">
            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                onClick={handleScheduleMeeting}
                className="w-full h-auto py-3 px-3 bg-[#10B981] hover:bg-[#059669] text-white shadow-lg hover:shadow-xl shadow-emerald-500/50 transition-all duration-300"
              >
                <div className="flex items-center gap-2 w-full">
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Calendar className="h-4 w-4" />
                  </motion.div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-xs">Schedule a Meeting</p>
                    <p className="text-[10px] opacity-90">Create a new meeting</p>
                  </div>
                </div>
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Help Section - Fixed Height */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
      >
        <Card className="border border-gray-300/50 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 shadow-md hover:shadow-lg transition-all duration-300 w-full h-[140px] flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="flex items-center gap-1.5 text-gray-900 dark:text-white text-xs">
              <motion.div
                whileHover={{ scale: 1.2, rotate: 20 }}
                transition={{ duration: 0.2 }}
              >
                <Sparkles className="h-3 w-3 text-blue-500" />
              </motion.div>
              Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 flex-1 min-h-0 overflow-hidden">
            <div className="space-y-1.5 text-[10px] text-slate-600 dark:text-slate-400">
              {['Quick actions check availability', 'Select participants for insights', 'Schedule from chat interface'].map((tip, index) => (
                <motion.p
                  key={index}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                  whileHover={{ x: 3, color: 'rgb(16, 185, 129)' }}
                >
                  • {tip}
                </motion.p>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      </div>
    </div>
  );
}

