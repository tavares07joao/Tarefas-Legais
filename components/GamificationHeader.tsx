
import React from 'react';
import { UserStats } from '../types';
import { Trophy, Star, Target } from 'lucide-react';
import { NEXT_LEVEL_XP_BASE } from '../constants';

interface GamificationHeaderProps {
  stats: UserStats;
}

const GamificationHeader: React.FC<GamificationHeaderProps> = ({ stats }) => {
  const xpNeeded = stats.level * NEXT_LEVEL_XP_BASE;
  const progressPercent = Math.min(100, (stats.xp / xpNeeded) * 100);

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
          <Trophy className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Task Master Pro</h1>
          <p className="text-sm text-slate-500 font-medium">Sua jornada de produtividade</p>
        </div>
      </div>

      <div className="flex-1 max-w-2xl w-full">
        <div className="flex justify-between items-end mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Nível</span>
            <span className="text-2xl font-black text-indigo-600">{stats.level}</span>
          </div>
          <div className="flex items-center gap-4 text-sm font-semibold text-slate-600">
             <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>{stats.xp} / {xpNeeded} XP</span>
             </div>
             <div className="flex items-center gap-1">
                <Target className="w-4 h-4 text-emerald-500" />
                <span>{stats.tasksCompleted} completas</span>
             </div>
          </div>
        </div>
        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(79,70,229,0.3)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-bold text-slate-800">Usuário Mestre</p>
          <p className="text-xs text-slate-400">Rank: Veterano</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
          <img src="https://picsum.photos/seed/user/100" alt="Profile" />
        </div>
      </div>
    </header>
  );
};

export default GamificationHeader;
