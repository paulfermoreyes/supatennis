import React from 'react';
import { Users, UserPlus, DollarSign } from 'lucide-react';
import { Player, Gender, PlayerClass } from '../types';
import { LineupValidationResult } from '../utils/validation';

interface RosterManagerProps {
  roster: Player[];
  lineupValidation: LineupValidationResult;
  newPlayerName: string;
  setNewPlayerName: (name: string) => void;
  newPlayerGender: Gender;
  setNewPlayerGender: (gender: Gender) => void;
  newPlayerClass: PlayerClass;
  setNewPlayerClass: (cls: PlayerClass) => void;
  editingPlayerId: string | null;
  setEditingPlayerId: (id: string | null) => void;
  editPlayerName: string;
  setEditPlayerName: (name: string) => void;
  editPlayerGender: Gender;
  setEditPlayerGender: (gender: Gender) => void;
  editPlayerClass: PlayerClass;
  setEditPlayerClass: (cls: PlayerClass) => void;
  courtHourRate: number;
  setCourtHourRate: (rate: number) => void;
  hoursPerMatch: number;
  setHoursPerMatch: (hours: number) => void;
  handleAddPlayer: (e: React.FormEvent) => void;
  startEditing: (p: Player) => void;
  handleSaveEdit: (e: React.FormEvent) => void;
  handleDeletePlayer: (id: string) => void;
  isAdmin?: boolean;
}

export function RosterManager({
  roster,
  lineupValidation,
  newPlayerName,
  setNewPlayerName,
  newPlayerGender,
  setNewPlayerGender,
  newPlayerClass,
  setNewPlayerClass,
  editingPlayerId,
  setEditingPlayerId,
  editPlayerName,
  setEditPlayerName,
  editPlayerGender,
  setEditPlayerGender,
  editPlayerClass,
  setEditPlayerClass,
  courtHourRate,
  setCourtHourRate,
  hoursPerMatch,
  setHoursPerMatch,
  handleAddPlayer,
  startEditing,
  handleSaveEdit,
  handleDeletePlayer,
  isAdmin = false,
}: RosterManagerProps) {
  
  const handleDragStart = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData('text/plain', playerId);
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="border border-gray-200 bg-white p-5 rounded-md shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <h3 className="font-bold text-wimbledon-green text-md uppercase font-serif-display flex items-center gap-1.5">
            <Users className="w-4 h-4 text-wimbledon-purple" /> Team Roster ({roster.length})
          </h3>
        </div>

        {/* Add Player Form (Admin Only) */}
        {isAdmin && (
          <form onSubmit={handleAddPlayer} className="flex flex-col gap-3 mb-6 bg-gray-50 p-3 rounded border border-gray-100 font-sans">
            <div className="text-2xs uppercase tracking-wider font-extrabold text-gray-500 font-sans">Add Roster Player</div>
            <input 
              type="text"
              placeholder="Player Name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              className="w-full text-xs p-2 border border-gray-300 rounded focus:border-wimbledon-purple focus:outline-none bg-white text-gray-900 font-sans"
              required
            />
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Gender</label>
                <select
                  value={newPlayerGender}
                  onChange={(e) => setNewPlayerGender(e.target.value as Gender)}
                  className="w-full text-xs p-1.5 border border-gray-300 rounded bg-white text-gray-900 font-sans"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Class</label>
                <select
                  value={newPlayerClass}
                  onChange={(e) => setNewPlayerClass(e.target.value as PlayerClass)}
                  className="w-full text-xs p-1.5 border border-gray-300 rounded bg-white text-gray-900 font-sans"
                >
                  <option value="A">Class A</option>
                  <option value="B">Class B</option>
                  <option value="C">Class C</option>
                  <option value="D">Class D</option>
                </select>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full text-xs bg-wimbledon-green hover:bg-wimbledon-green-hover text-white py-1.5 px-3 rounded font-bold transition-colors uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer border-0"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add Player
            </button>
          </form>
        )}

        {/* Roster List */}
        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
          {roster.map((p) => {
            const matchesPlaying = lineupValidation.playerCounts[p.id] || 0;
            const isOverplayed = matchesPlaying > 2;

            return (
              <div 
                key={p.id}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, p.id)}
                className={`p-2.5 border rounded flex flex-col gap-1 select-none transition-all ${
                  isOverplayed 
                    ? 'border-red-300 bg-red-50/20' 
                    : 'border-gray-100 hover:border-gray-300 bg-white hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5 font-sans">
                    <span className={`w-2 h-2 rounded-full ${p.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'}`}></span>
                    {p.name}
                  </span>
                  
                  {isAdmin && (
                    <div className="flex items-center gap-1 font-sans">
                      <button
                        onClick={() => startEditing(p)}
                        className="text-2xs text-gray-400 hover:text-wimbledon-purple font-semibold p-0.5 cursor-pointer bg-transparent border-0"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePlayer(p.id)}
                        className="text-2xs text-gray-400 hover:text-red-650 font-semibold p-0.5 cursor-pointer bg-transparent border-0"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-wimbledon-purple font-extrabold uppercase bg-wimbledon-purple-light/20 px-1.5 py-0.5 rounded font-sans">
                    Class {p.class}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">Playcount:</span>
                    <span className={`px-1.5 py-0.2 rounded-full font-bold ${
                      matchesPlaying === 0 ? 'bg-gray-100 text-gray-500' :
                      matchesPlaying === 1 ? 'bg-emerald-50 text-emerald-700' :
                      matchesPlaying === 2 ? 'bg-wimbledon-purple-light text-wimbledon-purple' :
                      'bg-red-100 text-red-700 font-extrabold'
                    }`}>
                      {matchesPlaying}/2
                    </span>
                  </div>
                </div>

                {editingPlayerId === p.id && isAdmin && (
                  <div className="mt-2 bg-gray-50 p-2 rounded border border-gray-200">
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1.5">Edit Player</div>
                    <input 
                      type="text"
                      value={editPlayerName}
                      onChange={(e) => setEditPlayerName(e.target.value)}
                      className="w-full text-xs p-1 border border-gray-300 bg-white text-gray-900 rounded mb-1.5"
                    />
                    <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                      <select
                        value={editPlayerGender}
                        onChange={(e) => setEditPlayerGender(e.target.value as Gender)}
                        className="text-2xs p-1 border border-gray-300 bg-white text-gray-900 rounded"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                      <select
                        value={editPlayerClass}
                        onChange={(e) => setEditPlayerClass(e.target.value as PlayerClass)}
                        className="text-2xs p-1 border border-gray-300 bg-white text-gray-900 rounded"
                      >
                        <option value="A">Class A</option>
                        <option value="B">Class B</option>
                        <option value="C">Class C</option>
                        <option value="D">Class D</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditingPlayerId(null)} className="text-[10px] px-2 py-0.5 border rounded text-gray-505 bg-white cursor-pointer font-sans">Cancel</button>
                      <button onClick={handleSaveEdit} className="text-[10px] px-2 py-0.5 bg-wimbledon-green text-white rounded font-bold cursor-pointer font-sans">Save</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-400 italic font-sans leading-relaxed">
          💡 Drag and drop players from roster cards directly into the lineup slots.
        </div>
      </div>

      {/* Sub-Card: Settings / Budget inputs */}
      <div className="border border-gray-200 bg-white p-5 rounded-md shadow-sm">
        <h3 className="font-bold text-wimbledon-green text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-wimbledon-gold" /> Budget Settings
        </h3>
        
        <div className="flex flex-col gap-4 font-sans font-medium">
          <div>
            <label className="text-[10px] text-gray-500 font-bold block mb-1">COURT HOURLY RATE</label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400">₱</span>
              <input 
                type="number"
                value={courtHourRate}
                onChange={(e) => setCourtHourRate(Math.max(0, parseInt(e.target.value) || 0))}
                disabled={!isAdmin}
                className="w-full text-xs p-1.5 border border-gray-300 rounded bg-white text-gray-900 font-bold focus:border-wimbledon-purple focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 font-bold block mb-1">HOURS ALLOCATED / MATCH DAY</label>
            <div className="flex items-center gap-2">
              <input 
                type="number"
                value={hoursPerMatch}
                onChange={(e) => setHoursPerMatch(Math.max(1, parseInt(e.target.value) || 0))}
                disabled={!isAdmin}
                className="w-full text-xs p-1.5 border border-gray-300 rounded bg-white text-gray-900 font-bold focus:border-wimbledon-purple focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <span className="text-2xs text-gray-400 font-bold">hrs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default RosterManager;
