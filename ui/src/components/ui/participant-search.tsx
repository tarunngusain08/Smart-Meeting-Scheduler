import { useState, useRef, useEffect } from "react";
import { Search, X, UserPlus } from "lucide-react";

interface ParticipantSearchProps {
  onAddParticipant: (email: string) => void;
  existingParticipants: { email: string; name?: string }[];
}

export function ParticipantSearch({ onAddParticipant, existingParticipants }: ParticipantSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleAddParticipant = () => {
    if (searchQuery.trim() && !existingParticipants.some(p => p.email === searchQuery.trim())) {
      onAddParticipant(searchQuery.trim());
      setSearchQuery("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddParticipant();
    }
  };

  return (
    <div className="space-y-2">
      <div 
        ref={containerRef}
        className={`relative flex items-center w-full border rounded-xl transition-all duration-200 ${
          isFocused 
            ? 'border-green-400 ring-2 ring-green-100' 
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="absolute left-3 text-gray-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          ref={inputRef}
          type="email"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Enter email to add participant..."
          className="w-full py-3 pl-10 pr-12 bg-transparent border-0 focus:ring-0 text-sm text-gray-800 placeholder-gray-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-12 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={handleAddParticipant}
          disabled={!searchQuery.trim()}
          className={`absolute right-2 p-1.5 rounded-lg transition-all ${
            searchQuery.trim()
              ? 'text-green-600 hover:bg-green-50'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          type="button"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      </div>
      
      {existingParticipants.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {existingParticipants.map((participant) => (
            <div 
              key={participant.email} 
              className="inline-flex items-center bg-green-50 text-green-800 text-xs px-3 py-1.5 rounded-full"
            >
              <span className="mr-1.5 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">
                {participant.name?.[0]?.toUpperCase() || participant.email[0].toUpperCase()}
              </span>
              {participant.name || participant.email}
              <button 
                onClick={() => {
                  // Remove participant
                  onAddParticipant(participant.email);
                }}
                className="ml-1.5 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
