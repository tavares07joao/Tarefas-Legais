
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Filter, X, Calendar as CalendarIcon, Repeat, CheckCircle, Flame, CalendarClock, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { Task, UserStats, TaskStatus, Priority, RecurrenceType } from './types';
import { STATUS_CONFIG, XP_PER_TASK, NEXT_LEVEL_XP_BASE } from './constants';
import Sidebar from './components/Sidebar';
import TaskCard from './components/TaskCard';
import TaskDetailModal from './components/TaskDetailModal';
import ProfileModal from './components/ProfileModal';

const STORAGE_KEY_TASKS = 'gamified-task-master-tasks';
const STORAGE_KEY_STATS = 'gamified-task-master-stats';
const STORAGE_KEY_THEME = 'gamified-task-master-theme';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const safeLocalStorageSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(`Failed to save to localStorage for key "${key}":`, e);
  }
};

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [stats, setStats] = useState<UserStats>({ 
    level: 1, 
    xp: 0, 
    totalXp: 0, 
    tasksCompleted: 0, 
    name: 'Usuário',
    streak: 0, 
    activeDays: [] 
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Estados para Mobile e Interação
  const [activeTab, setActiveTab] = useState<TaskStatus>('todo');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const hasCheckedPenalties = useRef(false);

  useEffect(() => {
    if (tasks.length > 0 && stats.lastPenaltyTimestamp !== undefined && !hasCheckedPenalties.current) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const lastCheck = new Date(stats.lastPenaltyTimestamp);
      lastCheck.setHours(0, 0, 0, 0);
      
      const diffDays = Math.floor((now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        let totalPenalty = 0;
        for (let i = 1; i <= diffDays; i++) {
          const checkDate = new Date(lastCheck);
          checkDate.setDate(checkDate.getDate() + i);
          
          tasks.forEach(task => {
            if (task.status !== 'done') {
              const taskDate = new Date(task.createdAt);
              taskDate.setHours(0, 0, 0, 0);
              if (checkDate.getTime() > taskDate.getTime()) {
                totalPenalty += 10;
              }
            }
          });
        }
        
        if (totalPenalty > 0) {
          applyPenalty(totalPenalty);
        }
        
        setStats(prev => ({ ...prev, lastPenaltyTimestamp: now.getTime() }));
        hasCheckedPenalties.current = true;
      }
    } else if (stats.lastPenaltyTimestamp === undefined && tasks.length > 0 && !hasCheckedPenalties.current) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setStats(prev => ({ ...prev, lastPenaltyTimestamp: today.getTime() }));
      hasCheckedPenalties.current = true;
    }
  }, [tasks, stats.lastPenaltyTimestamp]);

  useEffect(() => {
    const savedTasks = localStorage.getItem(STORAGE_KEY_TASKS);
    const savedStats = localStorage.getItem(STORAGE_KEY_STATS);
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as 'light' | 'dark' | null;
    
    try {
      if (savedTasks) {
        const parsedTasks: Task[] = JSON.parse(savedTasks);
        setTasks(parsedTasks);
      }
    } catch (e) {
      console.error("Failed to parse tasks:", e);
    }
    
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme('dark');
    }

    try {
      if (savedStats) {
        const parsedStats: UserStats = JSON.parse(savedStats);
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const lastActivity = parsedStats.lastActivityTimestamp ? new Date(parsedStats.lastActivityTimestamp) : null;
        if (lastActivity) {
          lastActivity.setHours(0, 0, 0, 0);
          
          const diffInDays = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
          const isMonday = now.getDay() === 1;
          const isSunday = now.getDay() === 0;

          if (diffInDays > 1) {
            const skipSundayGrace = (diffInDays === 2 && isMonday);
            const sundayTodayGrace = (diffInDays === 1 && isSunday);
            
            if (!skipSundayGrace && !sundayTodayGrace) {
              parsedStats.streak = 0;
            }
          }
        }
        
        setStats(parsedStats);
      }
    } catch (e) {
      console.error("Failed to parse stats:", e);
    }
  }, []);

  // Atalhos de teclado globais
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N ou Cmd+N para nova tarefa
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setEditingTask(null);
        setIsModalOpen(true);
      }
      
      // Ctrl+F ou Cmd+F para focar na busca
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY_THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => { safeLocalStorageSet(STORAGE_KEY_TASKS, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { safeLocalStorageSet(STORAGE_KEY_STATS, JSON.stringify(stats)); }, [stats]);

  const updateActivity = () => {
    const today = new Date();
    const todayStr = getLocalDateString();
    const now = Date.now();
    
    setStats(prev => {
      const lastActivityDate = prev.lastActivityTimestamp ? getLocalDateString(new Date(prev.lastActivityTimestamp)) : null;
      
      let newStreak = prev.streak;
      const activeDays = prev.activeDays || [];
      const hasAlreadyActedToday = activeDays.includes(todayStr);

      if (!hasAlreadyActedToday) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterday);
        
        const dayBeforeYesterday = new Date();
        dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
        const dayBeforeYesterdayStr = getLocalDateString(dayBeforeYesterday);

        if (lastActivityDate === yesterdayStr) {
          newStreak += 1;
        } else if (today.getDay() === 1 && lastActivityDate === dayBeforeYesterdayStr) {
          newStreak += 1;
        } else if (lastActivityDate !== todayStr) {
          newStreak = 1;
        }
      }

      return {
        ...prev,
        streak: newStreak,
        lastActivityTimestamp: now,
        activeDays: hasAlreadyActedToday ? activeDays : [...activeDays, todayStr]
      };
    });
  };

  const grantXp = (amount: number, isTask: boolean = true) => {
    const multiplier = 1 + (stats.streak * 0.005);
    const bonusAmount = Math.round(amount * multiplier);

    setStats(prev => {
      let newXp = prev.xp + bonusAmount;
      let newLevel = prev.level;
      let xpNeeded = newLevel * NEXT_LEVEL_XP_BASE;
      while (newXp >= xpNeeded) {
        newXp -= xpNeeded;
        newLevel++;
        xpNeeded = newLevel * NEXT_LEVEL_XP_BASE;
      }
      return {
        ...prev,
        level: newLevel,
        xp: newXp,
        totalXp: prev.totalXp + bonusAmount,
        tasksCompleted: isTask ? prev.tasksCompleted + 1 : prev.tasksCompleted
      };
    });
    
    updateActivity();
  };

  const applyPenalty = (amount: number) => {
    setStats(prev => {
      let newXp = prev.xp - amount;
      let newLevel = prev.level;
      
      while (newXp < 0 && newLevel > 1) {
        newLevel--;
        const xpNeededForPrevLevel = newLevel * NEXT_LEVEL_XP_BASE;
        newXp = xpNeededForPrevLevel + newXp;
      }
      
      if (newXp < 0) newXp = 0;

      return {
        ...prev,
        level: newLevel,
        xp: newXp,
        // totalXp mantido como registro vitalício, não sofre penalidade
        totalXp: prev.totalXp
      };
    });
  };

  const updateProfile = (data: Partial<UserStats>) => {
    setStats(prev => ({ ...prev, ...data }));
  };

  const addTask = (data: Partial<Task>) => {
    let taskTimestamp = Date.now();
    
    if (selectedDate) {
      const baseDate = new Date(selectedDate);
      const now = new Date();
      baseDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      taskTimestamp = baseDate.getTime();
    }

    const newTask: Task = {
      id: generateId(),
      title: data.title || 'Sem título',
      description: data.description || '',
      status: 'todo',
      priority: data.priority || 'medium',
      tags: [],
      createdAt: taskTimestamp,
      recurrence: data.recurrence || 'none',
      recurrenceEndDate: data.recurrenceEndDate,
      recurrenceDays: data.recurrenceDays
    };
    setTasks([...tasks, newTask]);
    setIsModalOpen(false);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const taskDayStr = new Date(taskTimestamp).toISOString().split('T')[0];
    if (todayStr === taskDayStr) {
      updateActivity();
    }
  };

  const formatTagDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => {
      const updatedTasks = prev.map(t => {
        if (t.id === id) {
          let newTags = [...(updates.tags || t.tags)];
          let newStartedAt = updates.startedAt || t.startedAt;
          let newCompletedAt = updates.completedAt || t.completedAt;

          if (t.status !== 'in-progress' && updates.status === 'in-progress') {
            newStartedAt = Date.now();
            const startTag = `Começado em: ${formatTagDate(newStartedAt)}`;
            newTags = newTags.filter(tag => !tag.startsWith('Começado em:'));
            newTags.push(startTag);
            updateActivity();
          }

          if (t.status !== 'done' && updates.status === 'done') {
            newCompletedAt = Date.now();
            const finishTag = `Terminado em: ${formatTagDate(newCompletedAt)}`;
            newTags = newTags.filter(tag => !tag.startsWith('Terminado em:'));
            newTags.push(finishTag);
            newTags = newTags.filter(tag => tag !== 'Atrasada');
            grantXp(XP_PER_TASK[t.priority]);

            // Lógica de Recorrência: Criar próxima instância
            if (t.recurrence && t.recurrence !== 'none') {
              const nextDate = new Date(t.createdAt);
              if (t.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
              else if (t.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
              else if (t.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

              const shouldCreateNext = !t.recurrenceEndDate || nextDate.getTime() <= t.recurrenceEndDate;
              
              if (shouldCreateNext) {
                setTimeout(() => {
                  const nextTask: Task = {
                    ...t,
                    id: generateId(),
                    status: 'todo',
                    createdAt: nextDate.getTime(),
                    startedAt: undefined,
                    completedAt: undefined,
                    tags: []
                  };
                  setTasks(currentTasks => [...currentTasks, nextTask]);
                }, 500);
              }
            }
          }

          if (t.status === 'done' && updates.status !== 'done') {
            newCompletedAt = undefined;
            newTags = newTags.filter(tag => !tag.startsWith('Terminado em:'));
          }

          return { ...t, ...updates, tags: newTags, startedAt: newStartedAt, completedAt: newCompletedAt };
        }
        return t;
      });
      return updatedTasks;
    });
    setEditingTask(null);
    setIsModalOpen(false);
  };

  const cancelRecurrence = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, recurrence: 'none' as RecurrenceType } : t));
    if (viewingTask?.id === taskId) {
      setViewingTask(prev => prev ? { ...prev, recurrence: 'none' as RecurrenceType } : null);
    }
  };

  const onDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    setIsDraggingGlobal(true);
  };

  const onDragEnd = () => {
    setIsDraggingGlobal(false);
  };

  const onDrop = (e: React.DragEvent, status: TaskStatus) => {
    const taskId = e.dataTransfer.getData('taskId');
    updateTask(taskId, { status });
    setIsDraggingGlobal(false);
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Determinar qual data usar para o filtro: data de conclusão para tarefas feitas, data de criação para as demais
    const displayTimestamp = (t.status === 'done' && t.completedAt) ? t.completedAt : t.createdAt;
    
    const taskDate = new Date(displayTimestamp);
    taskDate.setHours(0, 0, 0, 0);
    
    if (selectedDate) {
      const filterDate = new Date(selectedDate);
      filterDate.setHours(0, 0, 0, 0);
      
      const isSameDay = taskDate.getTime() === filterDate.getTime();
      
      // Se for o dia de hoje, mostrar também as tarefas atrasadas de dias anteriores (que ainda não foram concluídas)
      const isToday = filterDate.getTime() === new Date().setHours(0, 0, 0, 0);
      const isOverdue = t.status !== 'done' && taskDate.getTime() < filterDate.getTime();

      return matchesSearch && (isSameDay || (isToday && isOverdue));
    }
    return matchesSearch;
  });

  const selectedDateLabel = selectedDate ? new Date(selectedDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  const isTodaySelected = selectedDate ? (
    new Date(selectedDate).toDateString() === new Date().toDateString()
  ) : true;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-600 dark:selection:text-indigo-200 overflow-hidden relative">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[45] md:hidden animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${!isDesktopSidebarOpen ? 'md:w-0 md:opacity-0 md:pointer-events-none' : 'md:w-80 md:opacity-100'}`}>
        <Sidebar 
          stats={stats} 
          tasks={tasks}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onFocusComplete={() => grantXp(20, false)} 
          onEditProfile={() => setIsProfileModalOpen(true)}
        />
      </div>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Toggle Sidebar Desktop */}
        <button 
          onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
          className={`hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-[60] p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-2xl transition-all hover:scale-110 active:scale-95 ${!isDesktopSidebarOpen ? 'translate-x-0' : 'translate-x-[-20px]'}`}
          title={isDesktopSidebarOpen ? "Esconder Painel" : "Mostrar Painel"}
        >
          {isDesktopSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        <div className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-900 px-4 md:px-8 py-4 md:py-6 flex items-center justify-between z-40">
          <div className="flex items-center gap-3 md:gap-4 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-indigo-400"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="relative flex-1 md:max-w-96 group">
              <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 h-4 text-slate-400 dark:text-slate-600 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Buscar tarefa (Ctrl+F)..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 md:pl-12 pr-4 py-2 md:py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-xs md:text-sm outline-none font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6 ml-4">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg group/streak">
              <Flame className={`w-5 h-5 transition-transform duration-500 group-hover/streak:scale-125 ${stats.streak > 0 ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-slate-300 dark:text-slate-700'}`} />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Sequência</span>
                <span className="text-sm font-black text-slate-900 dark:text-slate-100">{stats.streak} Dias</span>
              </div>
            </div>

            <button 
              onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
              className={`flex items-center gap-3 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 border
                ${!isTodaySelected ? 'bg-emerald-600 border-emerald-500' : 'bg-indigo-600 border-indigo-500'} text-white`}
              title="Ctrl+N para nova tarefa"
            >
              {!isTodaySelected ? <CalendarClock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {!isTodaySelected ? 'Agendar' : 'Nova Tarefa'}
            </button>
          </div>

          <div className="md:hidden flex items-center gap-2 ml-2">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
               <Flame className={`w-4 h-4 ${stats.streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-slate-300 dark:text-slate-700'}`} />
               <span className="text-xs font-black text-slate-900 dark:text-slate-100">{stats.streak}</span>
            </div>
          </div>
        </div>

        {selectedDate && (
          <div className="md:hidden px-4 py-2 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-900 flex justify-center">
            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5">
              <CalendarIcon className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-300 uppercase tracking-widest">Vendo: {selectedDateLabel}</span>
              <button onClick={() => setSelectedDate(null)} className="ml-1 text-slate-400"><X className="w-3 h-3" /></button>
            </div>
          </div>
        )}

        <div className="md:hidden flex bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-900">
          {(['todo', 'in-progress', 'done'] as TaskStatus[]).map(status => (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative
                ${activeTab === status ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-600'}`}
            >
              {STATUS_CONFIG[status].label}
              {activeTab === status && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-t-full" />
              )}
              <span className="ml-2 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[8px]">
                {filteredTasks.filter(t => t.status === status).length}
              </span>
            </button>
          ))}
        </div>

        <div className={`flex-1 overflow-x-auto md:overflow-x-visible overflow-y-hidden flex flex-col md:flex-row p-4 md:p-8 md:gap-10 bg-slate-50 dark:bg-slate-950 ${isDraggingGlobal ? 'dragging-active' : ''}`}>
          {(['todo', 'in-progress', 'done'] as TaskStatus[]).map(status => (
            <div 
              key={status} 
              onDrop={(e) => onDrop(e, status)}
              onDragOver={(e) => e.preventDefault()}
              className={`flex-col w-full md:w-96 flex-shrink-0 transition-opacity duration-300 ${activeTab === status ? 'flex' : 'hidden md:flex'}`}
            >
              <div className="hidden md:flex items-center justify-between mb-8 px-4">
                <div className="flex items-center gap-4">
                  <div className={`w-2.5 h-2.5 rounded-full ${status === 'todo' ? 'bg-slate-300 dark:bg-slate-600' : status === 'in-progress' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`} />
                  <h3 className="font-black text-slate-400 dark:text-slate-400 text-xs uppercase tracking-[0.2em]">{STATUS_CONFIG[status].label}</h3>
                  <div className="bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 text-[10px] font-black px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
                    {filteredTasks.filter(t => t.status === status).length}
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-4 md:gap-6 rounded-[2rem] md:rounded-[3rem] bg-slate-100/50 dark:bg-slate-900/30 p-2 md:p-4 border-2 border-dashed border-slate-200 dark:border-slate-900/50 overflow-y-auto custom-scrollbar pb-20 md:pb-10">
                {filteredTasks
                  .filter(t => t.status === status)
                  .map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onDragStart={onDragStart} 
                      onDragEnd={onDragEnd}
                      onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }}
                      onDelete={(id) => setTasks(prev => prev.filter(t => t.id !== id))}
                      onView={(t) => setViewingTask(t)}
                      onComplete={(id) => updateTask(id, { status: 'done' })}
                    />
                  ))}
                {filteredTasks.filter(t => t.status === status).length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-20 select-none">
                     <CheckCircle className="w-12 h-12 mb-4 text-slate-400" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nada por aqui ainda</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
          className={`md:hidden fixed bottom-6 right-6 w-16 h-16 rounded-3xl shadow-2xl flex items-center justify-center text-white z-[40] transition-all active:scale-90 border border-white/20
            ${!isTodaySelected ? 'bg-emerald-600' : 'bg-indigo-600'}`}
        >
          {!isTodaySelected ? <CalendarClock className="w-6 h-6" /> : <Plus className="w-6 h-6 stroke-[3px]" />}
        </button>
      </main>

      {isModalOpen && (
        <TaskModal 
          task={editingTask} 
          onClose={() => { setIsModalOpen(false); setEditingTask(null); }} 
          onSave={(data) => editingTask ? updateTask(editingTask.id, data) : addTask(data)}
        />
      )}

      {viewingTask && (
        <TaskDetailModal 
          task={viewingTask} 
          onClose={() => setViewingTask(null)} 
          onCancelRecurrence={cancelRecurrence}
        />
      )}

      {isProfileModalOpen && (
        <ProfileModal 
          stats={stats}
          theme={theme}
          onThemeChange={setTheme}
          onClose={() => setIsProfileModalOpen(false)}
          onSave={updateProfile}
        />
      )}
    </div>
  );
};

const TaskModal: React.FC<{task: any, onClose: any, onSave: any}> = ({ task, onClose, onSave }) => {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<Priority>(task?.priority || 'medium');
  const [recurrence, setRecurrence] = useState<RecurrenceType>(task?.recurrence || 'none');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(task?.recurrenceDays || []);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>(
    task?.recurrenceEndDate ? new Date(task.recurrenceEndDate).toISOString().split('T')[0] : ''
  );

  const toggleDay = (day: number) => {
    setRecurrenceDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        <div className="px-6 md:px-10 py-6 md:py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30">
          <h2 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">{task ? 'Editar Tarefa' : 'Lançar Tarefa'}</h2>
          <button onClick={onClose} className="p-2 md:p-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-full transition-all text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          onSave({ 
            title, 
            description, 
            priority, 
            recurrence, 
            recurrenceDays,
            recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate).getTime() : undefined 
          });
        }} className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar">
          <div className="space-y-2 md:space-y-4">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Título da Tarefa</label>
            <input 
              required autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full text-2xl md:text-3xl font-black placeholder:text-slate-200 dark:placeholder:text-slate-800 text-slate-900 dark:text-slate-100 border-none focus:ring-0 outline-none p-0 tracking-tight bg-transparent"
              placeholder="Digite o título..."
            />
          </div>

          <div className="space-y-2 md:space-y-4">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Instruções</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="O que deve ser feito?"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-4 md:space-y-5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Prioridade</label>
              <div className="flex flex-col gap-2">
                {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                  <button
                    key={p} type="button" onClick={() => setPriority(p)}
                    className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 text-left flex items-center justify-between
                      ${priority === p ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-600 border-slate-200 dark:border-slate-800'} text-xs md:text-sm font-bold`}
                  >
                    {p === 'low' ? 'Baixa' : p === 'medium' ? 'Média' : 'Alta'}
                    {priority === p && <CheckCircle className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 md:space-y-5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Repetição</label>
              <div className="flex flex-col gap-2">
                {(['none', 'daily', 'weekly', 'monthly'] as RecurrenceType[]).map((r) => (
                  <button
                    key={r} type="button" onClick={() => {
                      setRecurrence(r);
                      if (r === 'none' || r === 'daily') setRecurrenceDays([]);
                    }}
                    className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 text-left flex items-center justify-between
                      ${recurrence === r ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-600 border-slate-200 dark:border-slate-800'} text-xs md:text-sm font-bold`}
                  >
                    {r === 'none' ? 'Única' : r === 'daily' ? 'Diária' : r === 'weekly' ? 'Semanal' : 'Mensal'}
                    <Repeat className={`w-3.5 h-3.5 ${recurrence === r ? 'text-white' : 'text-slate-400 dark:text-slate-800'}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {recurrence === 'weekly' && (
            <div className="space-y-4 animate-in slide-in-from-top-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Dias da Semana</label>
              <div className="flex flex-wrap gap-2">
                {weekDays.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`w-10 h-10 rounded-xl text-[10px] font-black uppercase transition-all border-2 flex items-center justify-center
                      ${recurrenceDays.includes(idx) ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-600 border-slate-200 dark:border-slate-800'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {recurrence === 'monthly' && (
            <div className="space-y-4 animate-in slide-in-from-top-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Dias do Mês</label>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 31 }).map((_, i) => {
                  const dayNum = i + 1;
                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => toggleDay(dayNum)}
                      className={`h-8 rounded-lg text-[10px] font-black transition-all border-2 flex items-center justify-center
                        ${recurrenceDays.includes(dayNum) ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-600 border-slate-200 dark:border-slate-800'}`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Data Limite (Opcional)</label>
            <input 
              type="date" 
              value={recurrenceEndDate} 
              onChange={(e) => setRecurrenceEndDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm font-bold text-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <button type="submit" className="w-full py-4 md:py-5 bg-indigo-600 text-white font-black rounded-2xl md:rounded-3xl hover:bg-indigo-500 shadow-2xl transition-all uppercase tracking-[0.2em] text-[10px] md:text-xs border border-indigo-500 sticky bottom-0">
            {task ? 'Confirmar Jornada' : 'Iniciar Tarefa'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;
