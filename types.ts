
export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type Priority = 'low' | 'medium' | 'high';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  tags: string[];
  createdAt: number;
  order?: number;
  startedAt?: number;
  completedAt?: number;
  subtasks?: SubTask[];
  // Recorrência
  recurrence?: RecurrenceType;
  recurrenceEndDate?: number;
  recurrenceDays?: number[]; // [0, 1, 2, 3, 4, 5, 6] onde 0 é Domingo
}

export interface UserStats {
  level: number;
  xp: number;
  totalXp: number;
  tasksCompleted: number;
  name?: string;
  avatarUrl?: string;
  bio?: string;
  achievements?: Achievement[];
  focusSessionsCompleted?: number;
  // Sistema de Streak (Placeholder)
  streak: number;
  lastActivityTimestamp?: number;
  lastPenaltyTimestamp?: number;
  activeDays?: string[]; // Array de strings formatadas "YYYY-MM-DD" para o calendário
}

export interface FocusSession {
  isActive: boolean;
  timeLeft: number;
  duration: number;
}

export interface MusicTrack {
  id: string;
  name: string;
  url: string;
  type: 'stream' | 'youtube';
  description?: string;
}
