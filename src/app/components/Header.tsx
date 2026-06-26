import React from 'react';
import { HelpCircle, RotateCcw, Sliders, Calendar, LogIn, UserPlus, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  activeTab: 'customizer' | 'planner';
  setActiveTab: (tab: 'customizer' | 'planner') => void;
  showExplanation: boolean;
  setShowExplanation: (show: boolean) => void;
  isCloudSynced: boolean;
  onResetTuner: () => void;
  currentUser: User | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}


export function Header({
  activeTab,
  setActiveTab,
  showExplanation,
  setShowExplanation,
  isCloudSynced,
  onResetTuner,
  currentUser,
  onLogout,
  onOpenLogin,
  onOpenRegister,
}: HeaderProps) {
  return (
    <header className="border-t-[6px] border-wimbledon-green border-b border-gray-100 bg-white pt-8 pb-4 px-6 md:px-12 shadow-2xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-wimbledon-purple font-sans">
              The All England Racket Lab
            </span>
            {isCloudSynced ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Cloud Synced (Supabase)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Local Mode (Offline)
              </span>
            )}
          </div>
          
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-wimbledon-green uppercase font-serif-display">
            Wimbledon <span className="italic font-medium text-wimbledon-purple">Lab</span>
          </h1>
          
          <p className="text-gray-600 mt-2 text-md max-w-2xl leading-relaxed italic border-0">
            Bespoke racquet customization and tournament lineup planner platform for team matches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-end">
          {/* User Profile / Auth Actions */}
          {currentUser ? (
            <div className="flex items-center gap-3 border border-gray-100 bg-gray-50/50 p-1.5 pr-3 rounded-md font-sans">
              <div className="bg-wimbledon-purple-light text-wimbledon-purple p-1.5 rounded">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-xs font-bold text-gray-800">{currentUser.name}</span>
                <span className="text-[10px] text-gray-500 font-semibold mt-0.5">
                  @{currentUser.username} • Class {currentUser.class}
                </span>
              </div>
              <button 
                onClick={onLogout}
                className="text-gray-400 hover:text-red-600 p-1 cursor-pointer bg-transparent border-0 ml-1"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 font-sans">
              <button 
                onClick={onOpenLogin}
                className="text-xs flex items-center gap-1 px-3 py-2 border border-gray-200 hover:border-wimbledon-purple text-gray-700 font-bold rounded cursor-pointer bg-white"
              >
                <LogIn className="w-3.5 h-3.5 text-wimbledon-purple mr-1" />
                Login
              </button>
              <button 
                onClick={onOpenRegister}
                className="text-xs flex items-center gap-1 px-3 py-2 bg-wimbledon-purple hover:bg-wimbledon-purple-hover text-white font-bold rounded cursor-pointer border-0"
              >
                <UserPlus className="w-3.5 h-3.5 text-white mr-1" />
                Register
              </button>
            </div>
          )}

          <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

          <button 
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-xs flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 hover:border-wimbledon-purple text-gray-700 font-semibold rounded transition-all cursor-pointer bg-white"
          >
            <HelpCircle className="w-3.5 h-3.5 text-wimbledon-purple" />
            Physics Guides
          </button>
          
          {activeTab === 'customizer' && (
            <button 
              onClick={onResetTuner}
              className="text-xs flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 hover:border-wimbledon-green text-gray-700 font-semibold rounded transition-all cursor-pointer bg-white"
            >
              <RotateCcw className="w-3.5 h-3.5 text-wimbledon-green" />
              Reset Tuner
            </button>
          )}
        </div>
      </div>

      {/* Top-Level Tab Selectors */}
      <div className="max-w-7xl mx-auto mt-8 flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('customizer')}
          className={`py-3.5 px-6 font-serif-display text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'customizer'
              ? 'border-wimbledon-green text-wimbledon-green font-extrabold'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <Sliders className="w-4 h-4" /> Racquet Customizer
        </button>
        
        <button
          onClick={() => setActiveTab('planner')}
          className={`py-3.5 px-6 font-serif-display text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'planner'
              ? 'border-wimbledon-green text-wimbledon-green font-extrabold'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <Calendar className="w-4 h-4" /> Match & Lineup Planner
        </button>
      </div>
    </header>
  );
}

