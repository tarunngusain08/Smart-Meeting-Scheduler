import React, { useState } from "react";
import { X, Calendar, Clock, Users, Search, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "./badge";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: { email: string; name?: string }[];
  setParticipants: (p: { email: string; name?: string }[]) => void;
  onSchedule: (data: {
    participants: string[];
    dateRange: "today" | "this-week" | "next-week";
    duration: number;
  }) => void;
}

export function ScheduleMeetingModal({
  isOpen,
  onClose,
  participants,
  setParticipants,
  onSchedule,
}: ScheduleMeetingModalProps) {
  const [dateRange, setDateRange] = useState<"today" | "this-week" | "next-week">("this-week");
  const [duration, setDuration] = useState<number>(60);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  console.log('ScheduleMeetingModal rendered, isOpen:', isOpen);

  // Don't render anything if not open
  if (!isOpen) {
    return null;
  }

  const handleAddParticipant = (email: string) => {
    if (participants.some(p => p.email === email)) {
      // Remove participant if already exists
      setParticipants(participants.filter(p => p.email !== email));
    } else {
      // Add new participant
      setParticipants([...participants, { email, name: email }]);
    }
  };

  const availableParticipants = [
    { email: 'sarah@example.com', name: 'Sarah Johnson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
    { email: 'mike@example.com', name: 'Mike Chen', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike' },
    { email: 'alex@example.com', name: 'Alex Rivera', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
    { email: 'emma@example.com', name: 'Emma Davis', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma' },
  ];

  const [showParticipants, setShowParticipants] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const filteredParticipants = availableParticipants.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleParticipant = (email: string) => {
    if (participants.some(p => p.email === email)) {
      setParticipants(participants.filter(p => p.email !== email));
    } else {
      const participant = availableParticipants.find(p => p.email === email);
      if (participant) {
        setParticipants([...participants, participant]);
      }
    }
  };

  const handleSubmit = () => {
    setIsLoading(true);
    setTimeout(() => {
      onSchedule({
        participants: participants.map(p => p.email),
        dateRange,
        duration,
      });
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule a Meeting
              </h2>
              <p className="text-sm text-white/90 mt-1">
                Select participants, date range, and duration to find optimal slots
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Participants */}
          <div>
            <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
              <Users className="h-4 w-4" />
              Participants
            </label>
            <div className="relative">
              <button
                onClick={() => setShowParticipants(!showParticipants)}
                className="w-full text-left p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                {participants.length === 0 ? (
                  <span className="text-gray-500">Select participants...</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {participants.map((p) => (
                      <Badge key={p.email} variant="secondary" className="bg-blue-100 text-blue-700">
                        {p.name || p.email}
                      </Badge>
                    ))}
                  </div>
                )}
                <svg
                  className={`h-4 w-4 text-gray-400 transition-transform ${showParticipants ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showParticipants && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute z-10 w-full mt-2 p-2 rounded-lg border border-gray-200 bg-white shadow-lg"
                >
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search participants..."
                      className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {filteredParticipants.map((participant) => (
                      <button
                        key={participant.email}
                        onClick={() => toggleParticipant(participant.email)}
                        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 transition-colors text-left"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={participant.avatar} />
                          <AvatarFallback>{participant.name?.[0] || participant.email[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{participant.name}</p>
                          <p className="text-xs text-gray-500">{participant.email}</p>
                        </div>
                        {participants.some(p => p.email === participant.email) && (
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
            <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
              <Calendar className="h-4 w-4" />
              Date Range
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["today", "this-week", "next-week"].map((range) => {
                const label = range
                  .split('-')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                  
                return (
                  <button
                    key={range}
                    onClick={() => setDateRange(range as any)}
                    className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                      dateRange === range
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
              <Clock className="h-4 w-4" />
              Duration
            </label>
            <Select value={duration.toString()} onValueChange={(val) => setDuration(Number(val))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={participants.length === 0 || isLoading}
            className={`w-full py-3 px-6 rounded-lg font-medium text-white bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 transition-all duration-200 shadow-lg shadow-blue-500/30 flex items-center justify-center ${
              participants.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finding Slots...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Find Optimal Slot
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={participants.length === 0 || isLoading}
            className={`px-6 py-3 rounded-xl font-medium transition-colors duration-200 flex items-center gap-2 ${
              participants.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-200 hover:scale-105'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>Find Optimal Slot</span>
          </button>
        </div>
        </motion.div>
      </div>
    </div>
  );
}
