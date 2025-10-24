import React from 'react';
import { Globe } from 'lucide-react';

export function TimeZonePanel() {
  // Get user's timezone
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timeZoneAbbr = new Date().toLocaleTimeString('en-us', { timeZoneName: 'short' }).split(' ')[2];

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
      <div className="flex items-center space-x-2 mb-4">
        <Globe className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900 text-[15px]">Time Zone</h3>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between py-1">
          <span className="text-[13px] text-gray-600 font-medium">Your timezone:</span>
          <span className="text-[13px] font-bold text-gray-900 bg-gray-50 px-3 py-1 rounded-lg">{timeZoneAbbr}</span>
        </div>
        
        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 mt-2">
          <p className="text-[12px] text-blue-900 leading-relaxed font-medium">
            All times shown in {timeZoneAbbr}. Participants in other zones will see adjusted times.
          </p>
        </div>
        
        <div className="text-[11px] text-gray-500 mt-2 pt-2 border-t border-gray-100">
          <span className="font-semibold">Location:</span> <span className="text-gray-600">{userTimeZone}</span>
        </div>
      </div>
    </div>
  );
}
