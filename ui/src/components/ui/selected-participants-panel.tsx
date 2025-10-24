import React from 'react';
import { Users } from 'lucide-react';

interface SelectedParticipantsPanelProps {
  participants: { email: string; name?: string }[];
}

export function SelectedParticipantsPanel({ participants }: SelectedParticipantsPanelProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
      <div className="flex items-center space-x-2 mb-5">
        <Users className="w-5 h-5 text-emerald-600" />
        <h3 className="font-semibold text-gray-900 text-[15px]">Selected Participants</h3>
      </div>
      
      {participants.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 font-medium mb-1">No participants selected</p>
          <p className="text-xs text-gray-500">
            Select participants from the scheduling widget to see their details here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {participants.map((participant, index) => (
            <div
              key={index}
              className="flex items-center space-x-3 p-3 rounded-xl hover:bg-emerald-50/50 transition-colors border border-transparent hover:border-emerald-100"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                {participant.name?.[0]?.toUpperCase() || participant.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {participant.name || participant.email.split('@')[0]}
                </p>
                <p className="text-xs text-gray-600 truncate">{participant.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
