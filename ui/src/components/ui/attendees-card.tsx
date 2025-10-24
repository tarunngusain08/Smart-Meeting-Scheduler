import React from "react";
import { Users, X } from "lucide-react";

interface AttendeesCardProps {
  participants: { email: string; name?: string }[];
  onRemoveParticipant?: (email: string) => void;
}

export function AttendeesCard({ participants, onRemoveParticipant }: AttendeesCardProps) {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 p-4 w-80">
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
          <Users className="w-4 h-4 text-green-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">
          Selected Attendees
        </h3>
        <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {participants.length}
        </span>
      </div>

      {participants.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No attendees selected</p>
          <p className="text-xs mt-1">Use "Add Participants" to add attendees</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-green-200 scrollbar-track-transparent">
          {participants.map((participant, index) => (
          <div
            key={participant.email}
            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 group"
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {participant.name
                  ? participant.name.charAt(0).toUpperCase()
                  : participant.email.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {participant.name && (
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {participant.name}
                  </p>
                )}
                <p className="text-xs text-gray-500 truncate">
                  {participant.email}
                </p>
              </div>
            </div>
            {onRemoveParticipant && (
              <button
                onClick={() => onRemoveParticipant(participant.email)}
                className="ml-2 p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                title="Remove attendee"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        </div>
      )}
    </div>
  );
}
