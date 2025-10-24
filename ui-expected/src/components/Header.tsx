import { Calendar, Moon, Sun, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout?: () => void;
}

export function Header({ darkMode, onToggleDarkMode, onLogout }: HeaderProps) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const handleLogoutClick = () => {
    console.log('Logout clicked!');
    if (onLogout) {
      onLogout();
    } else {
      console.error('onLogout is not defined!');
    }
  };

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
          {/* Temporary: Direct logout button for testing */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogoutClick}
            className="text-red-600 hover:bg-red-50 gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>

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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="relative h-9 w-9 rounded-full p-0 hover:ring-2 hover:ring-emerald-500/50 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
                title="Account menu"
                onClick={() => console.log('Avatar clicked!')}
              >
                <Avatar className="h-9 w-9 ring-2 ring-emerald-500/20 cursor-pointer">
                  <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=User" />
                  <AvatarFallback className="bg-emerald-100 text-emerald-700">{user.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 z-[100]" sideOffset={5}>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email || ''}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogoutClick} 
                className="text-red-600 cursor-pointer hover:bg-red-50 focus:bg-red-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
