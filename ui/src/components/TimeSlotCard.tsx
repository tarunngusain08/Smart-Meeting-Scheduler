import { Calendar, Clock, Users, CheckCircle2, RefreshCw, Settings2, TrendingUp } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface TimeSlotCardProps {
  slot: {
    id: string;
    date: string;
    time: string;
    duration: string;
    participants: string[];
    availability: string;
    confidence: number;
  };
  onConfirm: (slot: any) => void;
}

export function TimeSlotCard({ slot, onConfirm }: TimeSlotCardProps) {
  const handleRefresh = () => {
    toast.info('Refreshing availability...');
  };

  const handleAdjust = () => {
    toast.info('Adjusting duration...');
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Card className="border-2 border-gray-300/50 dark:border-slate-600 bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 hover:shadow-xl transition-all cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            {/* Left: Time Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-[#4A8456]" />
                <span className="text-gray-900 dark:text-white font-medium">{slot.date}</span>
                <Badge 
                  variant="secondary" 
                  className="bg-emerald-200 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {slot.confidence}% match
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-white font-medium">{slot.time}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">({slot.duration})</span>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <div className="flex -space-x-2">
                  {slot.participants.slice(0, 3).map((name, idx) => (
                    <Avatar key={idx} className="h-6 w-6 ring-2 ring-white dark:ring-slate-800">
                      <AvatarImage src={`${import.meta.env.VITE_AVATAR_API_URL || 'https://api.dicebear.com/7.x/avataaars/svg'}?seed=${name}`} />
                      <AvatarFallback className="text-xs">{name[0]}</AvatarFallback>
                    </Avatar>
                  ))}
                  {slot.participants.length > 3 && (
                    <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-800 flex items-center justify-center">
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        +{slot.participants.length - 3}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-[#4A8456] dark:text-emerald-400 font-medium ml-2">
                  {slot.availability}
                </span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onConfirm(slot)}
                className="border-2 border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold transition-all"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Confirm
              </Button>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleRefresh}
                  className="h-8 w-8 border-2 border-gray-300/60 dark:border-slate-600"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleAdjust}
                  className="h-8 w-8 border-2 border-gray-300/60 dark:border-slate-600"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
