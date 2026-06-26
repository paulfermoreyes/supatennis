import React from 'react';
import { Calendar, Plus, Trash2, Shield } from 'lucide-react';
import { ScheduledMatch, MatchStatus, User } from '../types';
import { DEFAULT_MATCH_FORMATS } from '../defaultData';
import { formatMatchDate } from '../utils/formatting';

interface MatchSchedulerProps {
  matches: ScheduledMatch[];
  activeMatchId: string;
  setActiveMatchId: (id: string) => void;
  showAddMatchForm: boolean;
  setShowAddMatchForm: (show: boolean) => void;
  newMatchTeam1: string;
  setNewMatchTeam1: (team: string) => void;
  newMatchTeam2: string;
  setNewMatchTeam2: (team: string) => void;
  newMatchDate: string;
  setNewMatchDate: (date: string) => void;
  newMatchFormatId: string;
  setNewMatchFormatId: (formatId: string) => void;
  newMatchTeam1Rep: string;
  setNewMatchTeam1Rep: (rep: string) => void;
  newMatchTeam2Rep: string;
  setNewMatchTeam2Rep: (rep: string) => void;
  handleAddMatch: (e: React.FormEvent) => void;
  handleDeleteMatch: (id: string) => void;
  handleUpdateMatchStatus: (id: string, status: MatchStatus) => void;
  handleRescheduleMatch: (id: string, dateStr: string) => void;
  handleFormatChange: (id: string, formatId: string) => void;
  isAdmin?: boolean;
  registeredUsers?: User[];
}

export function MatchScheduler({
  matches,
  activeMatchId,
  setActiveMatchId,
  showAddMatchForm,
  setShowAddMatchForm,
  newMatchTeam1,
  setNewMatchTeam1,
  newMatchTeam2,
  setNewMatchTeam2,
  newMatchDate,
  setNewMatchDate,
  newMatchFormatId,
  setNewMatchFormatId,
  newMatchTeam1Rep,
  setNewMatchTeam1Rep,
  newMatchTeam2Rep,
  setNewMatchTeam2Rep,
  handleAddMatch,
  handleDeleteMatch,
  handleUpdateMatchStatus,
  handleRescheduleMatch,
  handleFormatChange,
  isAdmin = false,
  registeredUsers = [],
}: MatchSchedulerProps) {
  return (
    <div className="border border-gray-200 bg-white p-5 rounded-md shadow-sm font-sans">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <h3 className="font-bold text-wimbledon-green text-md uppercase font-serif-display flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-wimbledon-purple" /> Match Schedules
        </h3>
        
        {isAdmin && (
          <button
            onClick={() => setShowAddMatchForm(!showAddMatchForm)}
            className="text-2xs bg-wimbledon-purple hover:bg-wimbledon-purple-hover text-white py-1 px-2 rounded-md font-bold transition-all uppercase tracking-wider flex items-center gap-1 cursor-pointer border-0"
          >
            <Plus className="w-3 h-3" /> Add Match
          </button>
        )}
      </div>

      {/* Add Match Form (Admin Only) */}
      {showAddMatchForm && isAdmin && (
        <form onSubmit={handleAddMatch} className="flex flex-col gap-3 mb-6 bg-gray-50 p-4 rounded border border-gray-200 font-sans">
          <div className="text-xs font-bold text-wimbledon-purple uppercase font-sans">Schedule New Encounter</div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 font-bold block mb-0.5">TEAM 1 (HOME)</label>
              <input 
                type="text" 
                value={newMatchTeam1} 
                onChange={(e) => setNewMatchTeam1(e.target.value)}
                className="w-full text-xs p-1.5 border border-gray-300 bg-white text-gray-900 rounded focus:border-wimbledon-purple focus:outline-none" 
                placeholder="e.g. Team A"
                required 
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-bold block mb-0.5">TEAM 2 (AWAY)</label>
              <input 
                type="text" 
                value={newMatchTeam2} 
                onChange={(e) => setNewMatchTeam2(e.target.value)}
                className="w-full text-xs p-1.5 border border-gray-300 bg-white text-gray-900 rounded focus:border-wimbledon-purple focus:outline-none" 
                placeholder="e.g. Team B"
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 font-bold block mb-0.5">TEAM 1 REP (HOME)</label>
              <select
                value={newMatchTeam1Rep}
                onChange={(e) => setNewMatchTeam1Rep(e.target.value)}
                className="w-full text-xs p-1.5 border border-gray-300 bg-white text-gray-900 rounded cursor-pointer"
              >
                <option value="">-- Choose Representative --</option>
                {registeredUsers.map(u => (
                  <option key={u.id} value={u.id}>@{u.username} ({u.name})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-bold block mb-0.5">TEAM 2 REP (AWAY)</label>
              <select
                value={newMatchTeam2Rep}
                onChange={(e) => setNewMatchTeam2Rep(e.target.value)}
                className="w-full text-xs p-1.5 border border-gray-300 bg-white text-gray-900 rounded cursor-pointer"
              >
                <option value="">-- Choose Representative --</option>
                {registeredUsers.map(u => (
                  <option key={u.id} value={u.id}>@{u.username} ({u.name})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 font-bold block mb-0.5">DATE & TIME</label>
            <input 
              type="datetime-local" 
              value={newMatchDate}
              onChange={(e) => setNewMatchDate(e.target.value)}
              className="w-full text-xs p-1.5 border border-gray-300 bg-white text-gray-900 rounded focus:border-wimbledon-purple focus:outline-none" 
              required
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-500 font-bold block mb-0.5">MATCH FORMAT</label>
            <select
              value={newMatchFormatId}
              onChange={(e) => setNewMatchFormatId(e.target.value)}
              className="w-full text-xs p-1.5 border border-gray-300 bg-white text-gray-900 rounded cursor-pointer"
            >
              {DEFAULT_MATCH_FORMATS.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-end mt-1 font-bold">
            <button 
              type="button" 
              onClick={() => setShowAddMatchForm(false)}
              className="text-xs py-1.5 px-3 border border-gray-300 bg-white text-gray-600 rounded cursor-pointer font-sans"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="text-xs py-1.5 px-3 bg-wimbledon-green text-white rounded cursor-pointer border-0 font-sans"
            >
              Schedule
            </button>
          </div>
        </form>
      )}

      {/* Matches List */}
      <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-1">
        {matches.map((m) => {
          const isSelected = activeMatchId === m.id;
          const formatDef = DEFAULT_MATCH_FORMATS.find(f => f.id === m.formatId) || DEFAULT_MATCH_FORMATS[0];

          // Lookup representative names
          const rep1User = registeredUsers.find(u => u.id === m.team1Rep);
          const rep2User = registeredUsers.find(u => u.id === m.team2Rep);

          return (
            <div 
              key={m.id}
              className={`p-3.5 border rounded-md transition-all flex flex-col gap-2 font-sans ${
                isSelected 
                  ? 'border-wimbledon-purple bg-wimbledon-purple-light/5 shadow-xs ring-1 ring-wimbledon-purple' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider font-extrabold text-wimbledon-green bg-wimbledon-green-light px-2 py-0.5 rounded font-sans">
                  {formatDef.name.split(' ')[0]} Format
                </div>
                
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteMatch(m.id)}
                    className="text-gray-400 hover:text-red-650 cursor-pointer p-0.5 bg-transparent border-0"
                    title="Delete Match"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Team vs Team Header */}
              <div className="flex justify-between items-center py-1">
                <span className="font-extrabold text-sm text-gray-800 font-serif-display uppercase">{m.team1}</span>
                <span className="text-2xs font-extrabold text-wimbledon-gold px-2 py-0.5 rounded bg-wimbledon-cream border border-wimbledon-gold/30 font-sans">VS</span>
                <span className="font-extrabold text-sm text-gray-800 font-serif-display uppercase">{m.team2}</span>
              </div>

              {/* Team Representatives Badge */}
              <div className="flex justify-between text-[9px] text-gray-500 border-b border-gray-50 pb-1.5 font-sans leading-none font-medium">
                <div>
                  <span className="text-gray-450 uppercase font-bold">Home Rep: </span>
                  <span className="font-bold text-wimbledon-purple">
                    {rep1User ? `@${rep1User.username}` : 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-450 uppercase font-bold">Away Rep: </span>
                  <span className="font-bold text-wimbledon-purple">
                    {rep2User ? `@${rep2User.username}` : 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Date details */}
              <div className="flex items-center justify-between text-2xs pt-1 text-gray-500 font-sans">
                <div className="flex items-center gap-1 font-semibold">
                  <Calendar className="w-3 h-3 text-wimbledon-purple" />
                  <span>{formatMatchDate(m.date)}</span>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex flex-col gap-2 mt-1.5 font-bold">
                <div className="grid grid-cols-2 gap-1.5">
                  {/* Reschedule Picker */}
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-gray-400 uppercase font-sans">Reschedule</span>
                    <input 
                      type="datetime-local"
                      value={m.date}
                      onChange={(e) => handleRescheduleMatch(m.id, e.target.value)}
                      disabled={!isAdmin}
                      className="text-4xs p-1 border border-gray-200 bg-white text-gray-900 rounded font-sans focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Status Select */}
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-gray-400 uppercase font-sans">Status</span>
                    <select
                      value={m.status}
                      onChange={(e) => handleUpdateMatchStatus(m.id, e.target.value as MatchStatus)}
                      disabled={!isAdmin}
                      className="text-4xs p-1 border border-gray-200 bg-white text-gray-900 rounded font-sans cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Postponed">Postponed</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 mt-1 font-bold">
                  {/* Match Format Switcher */}
                  <select
                    value={m.formatId}
                    onChange={(e) => handleFormatChange(m.id, e.target.value)}
                    disabled={!isAdmin}
                    className="text-[9px] p-1 border border-gray-200 bg-white text-gray-900 rounded font-sans cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {DEFAULT_MATCH_FORMATS.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>

                  {/* Selection Button */}
                  <button
                    onClick={() => setActiveMatchId(m.id)}
                    className={`text-2xs font-extrabold py-1 px-2.5 rounded transition-all cursor-pointer text-center uppercase tracking-wider font-sans ${
                      isSelected 
                        ? 'bg-wimbledon-purple text-white border border-transparent shadow-3xs' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-250 border border-gray-200'
                    }`}
                  >
                    Manage Lineup
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default MatchScheduler;
