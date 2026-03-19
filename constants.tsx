
import React from 'react';
import { Circle, Clock, CheckCircle2, AlertCircle, Flag } from 'lucide-react';

export const XP_PER_TASK = 25;

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

import { MusicTrack } from './types';

export const FOCUS_TRACKS: MusicTrack[] = [
  { 
    id: 'default-1', 
    name: 'LoFi Study Beats', 
    description: 'Rádio Lofi Girl para foco total', 
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', 
    type: 'youtube' 
  }
];

export const PLANT_LEVELS = [
  { level: 0, emoji: '🏔️', label: 'Campo Vazio' },
  { level: 1, emoji: '🌱', label: 'Início' },
  { level: 2, emoji: '🌿', label: 'Crescendo' },
  { level: 3, emoji: '🍀', label: 'Sorte' },
  { level: 4, emoji: '🪴', label: 'Vaso' },
  { level: 5, emoji: '🌻', label: 'Florindo' },
  { level: 6, emoji: '🌳', label: 'Árvore' },
  { level: 7, emoji: '🌲', label: 'Pinheiro' },
  { level: 8, emoji: '🌴', label: 'Estágio Máximo' },
];
