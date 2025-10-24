import React, { useState } from 'react';
import { Lightbulb, Clock, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { ProgressRing } from './progress-ring';

interface InsightCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function AIInsightsPanel() {
  const [expandedCards, setExpandedCards] = useState<number[]>([0, 1, 2]);

  const toggleCard = (index: number) => {
    setExpandedCards(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };
  const insights = [
    {
      title: 'Best Meeting Time',
      description: 'Tuesday afternoons have 87% higher attendance rates.',
      icon: <Clock className="w-4 h-4" />,
      color: 'text-blue-600',
      bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
      borderColor: 'border-l-blue-500',
      visual: <ProgressRing percentage={87} size={36} strokeWidth={3} color="#2563eb" />,
      metric: '87%'
    },
    {
      title: 'Time Zone Tip',
      description: 'Consider 10 AM PST to include all time zones comfortably.',
      icon: <Lightbulb className="w-4 h-4" />,
      color: 'text-purple-600',
      bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100/50',
      borderColor: 'border-l-purple-500',
      visual: <div className="text-lg font-bold text-purple-600">10 AM</div>,
      metric: 'PST'
    },
    {
      title: 'Team Availability',
      description: '3 participants are typically available tomorrow afternoon.',
      icon: <Users className="w-4 h-4" />,
      color: 'text-green-600',
      bgColor: 'bg-gradient-to-br from-green-50 to-green-100/50',
      borderColor: 'border-l-green-500',
      visual: (
        <div className="flex -space-x-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 border-2 border-white flex items-center justify-center text-white text-xs font-semibold">A</div>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center text-white text-xs font-semibold">B</div>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 border-2 border-white flex items-center justify-center text-white text-xs font-semibold">C</div>
        </div>
      ),
      metric: '3 people'
    }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
      <div className="flex items-center space-x-2 mb-5">
        <Lightbulb className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold text-gray-900 text-[15px]">AI Insights</h3>
      </div>
      <div className="space-y-3">
        {insights.map((insight, index) => {
          const isExpanded = expandedCards.includes(index);
          return (
            <div
              key={index}
              className={`${insight.bgColor} ${insight.borderColor} border-l-[3px] rounded-xl transition-all duration-300 hover:shadow-md cursor-pointer overflow-hidden`}
              onClick={() => toggleCard(index)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`${insight.color} flex-shrink-0`}>
                      {insight.icon}
                    </div>
                    <h4 className={`text-[14px] font-bold ${insight.color}`}>
                      {insight.title}
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    {insight.visual}
                    {isExpanded ? (
                      <ChevronUp className={`w-4 h-4 ${insight.color}`} />
                    ) : (
                      <ChevronDown className={`w-4 h-4 ${insight.color}`} />
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-3 pl-6 animate-fadeIn">
                    <p className="text-[12px] text-gray-700 leading-relaxed">
                      {insight.description}
                    </p>
                    <div className="mt-2 text-[11px] text-gray-500 font-medium">
                      {insight.metric}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
