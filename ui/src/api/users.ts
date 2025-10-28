export interface User {
	id: string;
	displayName: string;
	email: string;
	userPrincipalName?: string;
}

export interface Participant extends User {
	name: string;
	avatar: string;
	role?: string;
	timezone?: string;
	status?: 'available' | 'busy' | 'away';
}

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

export async function getAllUsers(): Promise<User[]> {
	const response = await fetch(`${API_BASE_URL}/graph/users`, {
		credentials: 'include',
	});

	if (!response.ok) {
		throw new Error('Failed to fetch users');
	}

	const users = await response.json();
	return users.map((user: any) => ({
		id: user.id,
		displayName: user.displayName,
		email: user.mail || user.email || user.userPrincipalName,
		userPrincipalName: user.userPrincipalName,
	}));
}

export async function searchUsers(query: string): Promise<User[]> {
	const response = await fetch(`${API_BASE_URL}/graph/users/search?q=${encodeURIComponent(query)}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		throw new Error('Failed to search users');
	}

	const users = await response.json();
	return users.map((user: any) => ({
		id: user.id,
		displayName: user.displayName,
		email: user.mail || user.email || user.userPrincipalName,
		userPrincipalName: user.userPrincipalName,
	}));
}

// Helper function to convert User to Participant format for UI components
export function userToParticipant(user: User): Participant {
	return {
		...user,
		name: user.displayName,
		avatar: `${import.meta.env.VITE_AVATAR_API_URL || 'https://api.dicebear.com/7.x/avataaars/svg'}?seed=${user.displayName}`,
		role: extractRole(user.email),
		timezone: 'PST',
		status: 'available',
	};
}

// Extract role from email domain or use default
function extractRole(email: string): string {
	// Simple role extraction logic - can be enhanced
	const domain = email.split('@')[0];
	if (domain.toLowerCase().includes('admin')) return 'Administrator';
	if (domain.toLowerCase().includes('dev')) return 'Developer';
	if (domain.toLowerCase().includes('manager')) return 'Manager';
	return 'Team Member';
}
