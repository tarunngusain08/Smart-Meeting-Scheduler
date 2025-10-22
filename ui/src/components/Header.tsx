import { Calendar, Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSignOut?: () => void;
}

export function Header({ darkMode, onToggleDarkMode, onSignOut }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between max-w-[1400px]">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 p-2 shadow-lg shadow-emerald-500/20">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-slate-900 dark:text-white tracking-tight">
              AI Meeting Assistant
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Smart scheduling made simple</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleDarkMode}
            className="rounded-full"
          >
            {darkMode ? (
              <Sun className="h-5 w-5 text-amber-500" />
            ) : (
              <Moon className="h-5 w-5 text-slate-600" />
            )}
          </Button>

          {onSignOut && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSignOut}
              className="rounded-full"
            >
              Sign Out
            </Button>
          )}

          <Avatar className="h-9 w-9 ring-2 ring-emerald-500/20">
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=User" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
