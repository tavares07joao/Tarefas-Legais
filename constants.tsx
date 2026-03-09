
import React from 'react';
import { Circle, Clock, CheckCircle2, AlertCircle, Flag } from 'lucide-react';

export const XP_PER_TASK = {
  low: 10,
  medium: 25,
  high: 50
};

export const NEXT_LEVEL_XP_BASE = 100;

export const STATUS_CONFIG = {
  todo: {
    label: 'Para fazer',
    icon: <Circle className="w-4 h-4 text-slate-500" />,
    bgColor: 'bg-slate-900',
    borderColor: 'border-slate-800'
  },
  'in-progress': {
    label: 'Em andamento',
    icon: <Clock className="w-4 h-4 text-blue-400" />,
    bgColor: 'bg-blue-900/20',
    borderColor: 'border-blue-800/30'
  },
  done: {
    label: 'Pronto',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    bgColor: 'bg-emerald-900/20',
    borderColor: 'border-emerald-800/30'
  }
};

export const PRIORITY_CONFIG = {
  low: { label: 'Baixa', color: 'bg-blue-900/40 text-blue-300 border-blue-800/50', icon: <Flag className="w-3 h-3" /> },
  medium: { label: 'Média', color: 'bg-amber-900/40 text-amber-300 border-amber-800/50', icon: <AlertCircle className="w-3 h-3" /> },
  high: { label: 'Alta', color: 'bg-rose-900/40 text-rose-300 border-rose-800/50', icon: <AlertCircle className="w-3 h-3" /> }
};

import { MusicTrack, Achievement } from './types';

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-task', title: 'Primeiro Passo', description: 'Conclua sua primeira tarefa', icon: '🎯' },
  { id: 'streak-3', title: 'Fogo Constante', description: 'Mantenha um streak de 3 dias', icon: '🔥' },
  { id: 'level-5', title: 'Veterano', description: 'Alcance o nível 5', icon: '🎖️' },
  { id: 'focus-master', title: 'Mestre do Foco', description: 'Complete 5 sessões de foco', icon: '🧘' },
];

export const FOCUS_TRACKS: MusicTrack[] = [
  { 
    id: 'default-1', 
    name: 'LoFi Study Beats', 
    description: 'Rádio Lofi Girl para foco total', 
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', 
    type: 'youtube' 
  }
];
