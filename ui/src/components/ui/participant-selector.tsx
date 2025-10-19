import { useState, useEffect, useRef } from "react";
import { UserPlus, X, Loader2, Check } from "lucide-react";
import { searchUsers } from "../../api/calendar";
import debounce from 'lodash/debounce';

interface Participant {
  email: string;
  name?: string;
}

interface SearchResult {
  id: string;
  displayName: string;
  email: string;
}

interface ParticipantSelectorProps {
  onParticipantsChange: (participants: Participant[]) => void;
}

export function ParticipantSelector({ onParticipantsChange }: ParticipantSelectorProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useRef(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      
      setIsLoading(true);
      try {
        const results = await searchUsers(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Failed to search users:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300)
  ).current;

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery]);

  const addParticipant = (participant: Participant) => {
    if (!participants.some(p => p.email === participant.email)) {
      const newParticipants = [...participants, participant];
      setParticipants(newParticipants);
      onParticipantsChange(newParticipants);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const removeParticipant = (email: string) => {
    const newParticipants = participants.filter(p => p.email !== email);
    setParticipants(newParticipants);
    onParticipantsChange(newParticipants);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < searchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        const selected = searchResults[selectedIndex];
        addParticipant({
          email: selected.email,
          name: selected.displayName
        });
      }
    } else if (e.key === 'Escape') {
      setSearchResults([]);
      setSelectedIndex(-1);
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-[#00B140] hover:bg-white transition-all duration-300"
      >
        <UserPlus className="w-4 h-4" />
        <span>Add Participants</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name or email"
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#00B140]"
            autoFocus
          />
          <button
            onClick={() => setIsAdding(false)}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div 
            ref={searchResultsRef}
            className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-60 overflow-auto"
          >
            {searchResults.map((result, index) => (
              <div
                key={result.id}
                className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${
                  index === selectedIndex ? 'bg-gray-50' : ''
                }`}
                onClick={() => addParticipant({
                  email: result.email,
                  name: result.displayName
                })}
              >
                <div className="font-medium">{result.displayName}</div>
                <div className="text-sm text-gray-500">{result.email}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {participants.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {participants.map((participant) => (
            <div
              key={participant.email}
              className="inline-flex items-center space-x-2 bg-green-50 border border-green-200 rounded-full px-3 py-1 text-sm text-green-700"
            >
              <span>{participant.name || participant.email}</span>
              <button
                onClick={() => removeParticipant(participant.email)}
                className="text-green-500 hover:text-green-700"
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
