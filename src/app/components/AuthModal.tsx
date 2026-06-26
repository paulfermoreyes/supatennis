import React, { useState } from 'react';
import { X, LogIn, UserPlus } from 'lucide-react';
import { Gender, PlayerClass } from '../types';

interface AuthModalProps {
  isOpen: 'login' | 'register' | null;
  onClose: () => void;
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onRegister: (
    name: string,
    username: string,
    password: string,
    gender: Gender,
    playerClass: PlayerClass
  ) => Promise<{ success: boolean; error?: string }>;
}

export function AuthModal({ isOpen, onClose, onLogin, onRegister }: AuthModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('Male');
  const [playerClass, setPlayerClass] = useState<PlayerClass>('B');
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);

    if (!username.trim() || !password) {
      setFormError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    try {
      if (isOpen === 'login') {
        const res = await onLogin(username, password);
        if (res.success) {
          onClose();
          resetForm();
        } else {
          setFormError(res.error || 'Login failed.');
        }
      } else {
        if (!name.trim()) {
          setFormError('Please enter your full name.');
          setLoading(false);
          return;
        }
        const res = await onRegister(name, username, password, gender, playerClass);
        if (res.success) {
          onClose();
          resetForm();
        } else {
          setFormError(res.error || 'Registration failed.');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setName('');
    setGender('Male');
    setPlayerClass('B');
    setFormError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-wimbledon-purple/30 backdrop-blur-md animate-fade-in font-sans">
      <div 
        className="relative w-full max-w-md bg-white border border-gray-200 shadow-2xl rounded-lg p-6 md:p-8 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-wimbledon-purple cursor-pointer p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-3">
          {isOpen === 'login' ? (
            <>
              <LogIn className="w-5 h-5 text-wimbledon-purple" />
              <h2 className="text-xl font-bold font-serif-display text-wimbledon-green uppercase">User Login</h2>
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5 text-wimbledon-purple" />
              <h2 className="text-xl font-bold font-serif-display text-wimbledon-green uppercase">Create Account</h2>
            </>
          )}
        </div>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs font-semibold">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isOpen === 'register' && (
            <div>
              <label className="text-2xs text-gray-500 font-bold block mb-1 uppercase">Full Name</label>
              <input
                type="text"
                placeholder="E.g. Roger Federer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded focus:border-wimbledon-purple focus:outline-none bg-white text-gray-900"
                required
              />
            </div>
          )}

          <div>
            <label className="text-2xs text-gray-500 font-bold block mb-1 uppercase">Username (Unique)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-bold font-sans">@</span>
              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full text-xs p-2.5 pl-7 border border-gray-300 rounded focus:border-wimbledon-purple focus:outline-none bg-white text-gray-900 font-bold"
                required
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Lowercase letters, numbers, and underscores only.</p>
          </div>

          <div>
            <label className="text-2xs text-gray-500 font-bold block mb-1 uppercase">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-xs p-2.5 border border-gray-300 rounded focus:border-wimbledon-purple focus:outline-none bg-white text-gray-900"
              required
            />
          </div>

          {isOpen === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs text-gray-500 font-bold block mb-1 uppercase">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full text-xs p-2 border border-gray-300 bg-white text-gray-900 rounded cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="text-2xs text-gray-500 font-bold block mb-1 uppercase">Baseline Class</label>
                <select
                  value={playerClass}
                  onChange={(e) => setPlayerClass(e.target.value as PlayerClass)}
                  className="w-full text-xs p-2 border border-gray-300 bg-white text-gray-900 rounded cursor-pointer"
                >
                  <option value="A">Class A</option>
                  <option value="B">Class B</option>
                  <option value="C">Class C</option>
                  <option value="D">Class D</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-xs bg-wimbledon-green hover:bg-wimbledon-green-hover text-white py-2.5 px-4 rounded font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer mt-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : isOpen === 'login' ? (
              <>
                <LogIn className="w-4 h-4" /> Sign In
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Create Account
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
