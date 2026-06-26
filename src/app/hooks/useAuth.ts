import { useState, useEffect } from 'react';
import { User, Gender, PlayerClass } from '../types';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const DEFAULT_USERS: User[] = [
  {
    id: 'u-admin',
    username: 'admin',
    name: 'Wimbledon Admin',
    gender: 'Male',
    class: 'A',
    password: 'admin'
  },
  {
    id: 'u-rep1',
    username: 'rep1',
    name: 'Team A Rep',
    gender: 'Male',
    class: 'B',
    password: 'rep'
  },
  {
    id: 'u-rep2',
    username: 'rep2',
    name: 'Team B Rep',
    gender: 'Female',
    class: 'B',
    password: 'rep'
  }
];

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync users list and persistent session on mount
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      setError(null);

      // Fetch persistent session from localStorage (works in both offline and online modes)
      const savedUser = localStorage.getItem('racket_current_user');
      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch (e) {
          localStorage.removeItem('racket_current_user');
        }
      }

      if (isSupabaseConfigured && supabase) {
        try {
          // 1. Fetch registered users from public.users
          const { data, error: fetchErr } = await supabase
            .from('users')
            .select('*')
            .order('username', { ascending: true });

          if (fetchErr) throw fetchErr;

          if (data && data.length > 0) {
            setUsers(data.map(u => ({
              id: u.id,
              username: u.username,
              name: u.name,
              gender: u.gender as Gender,
              class: u.class as PlayerClass,
              password: u.password // keep mock password for simple credentials auth
            })));
          } else {
            // Populate defaults if users table is empty
            const { error: insertErr } = await supabase.from('users').insert(DEFAULT_USERS);
            if (insertErr) throw insertErr;
            setUsers(DEFAULT_USERS);
          }
        } catch (e: any) {
          console.error('Failed to load users from Supabase:', e);
          setError(e.message || 'Failed to initialize cloud database auth.');
          // Fallback to defaults
          setUsers(DEFAULT_USERS);
        }
      } else {
        // Offline / LocalStorage Mode
        const savedUsers = localStorage.getItem('racket_users');
        if (savedUsers) {
          try {
            setUsers(JSON.parse(savedUsers));
          } catch (e) {
            setUsers(DEFAULT_USERS);
          }
        } else {
          setUsers(DEFAULT_USERS);
          localStorage.setItem('racket_users', JSON.stringify(DEFAULT_USERS));
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (usernameInput: string, passwordInput: string): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    const normalizedUsername = usernameInput.trim().toLowerCase();

    // Check offline memory list first
    const foundUser = users.find(u => u.username.toLowerCase() === normalizedUsername);
    if (!foundUser) {
      return { success: false, error: 'User not found. Please register.' };
    }

    if (foundUser.password !== passwordInput) {
      return { success: false, error: 'Incorrect password.' };
    }

    setCurrentUser(foundUser);
    localStorage.setItem('racket_current_user', JSON.stringify(foundUser));
    return { success: true };
  };

  const register = async (
    name: string,
    usernameInput: string,
    passwordInput: string,
    gender: Gender,
    playerClass: PlayerClass
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    const normalizedUsername = usernameInput.trim().toLowerCase();

    // Rule: unique username
    const usernameExists = users.some(u => u.username.toLowerCase() === normalizedUsername);
    if (usernameExists) {
      return { success: false, error: `Username @${normalizedUsername} is already taken.` };
    }

    const newUser: User = {
      id: `u-${Date.now()}`,
      username: normalizedUsername,
      name: name.trim(),
      password: passwordInput,
      gender,
      class: playerClass
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error: insertErr } = await supabase.from('users').insert({
          id: newUser.id,
          username: newUser.username,
          name: newUser.name,
          password: newUser.password,
          gender: newUser.gender,
          class: newUser.class
        });

        if (insertErr) throw insertErr;
      } catch (e: any) {
        console.error('Registration failed in cloud database:', e);
        return { success: false, error: e.message || 'Failed to save new user to cloud.' };
      }
    }

    // Update state and local storage
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    if (!isSupabaseConfigured) {
      localStorage.setItem('racket_users', JSON.stringify(updatedUsers));
    }

    // Automatically log in new user
    setCurrentUser(newUser);
    localStorage.setItem('racket_current_user', JSON.stringify(newUser));

    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('racket_current_user');
  };

  return {
    currentUser,
    users,
    loading,
    error,
    login,
    register,
    logout
  };
}

export type UseAuthReturn = ReturnType<typeof useAuth>;
