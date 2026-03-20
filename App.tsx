
import React, { useState, useEffect, useRef, useMemo, useCallback, Component } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Search, Filter, X, Calendar as CalendarIcon, Repeat, CheckCircle, CalendarClock, Menu, ChevronLeft, ChevronRight, Trash2, AlertCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, UserStats, TaskStatus, RecurrenceType } from './types';
import { STATUS_CONFIG, XP_PER_TASK, NEXT_LEVEL_XP_BASE } from './constants';
import Sidebar from './components/Sidebar';
import TaskCard from './components/TaskCard';
import TaskDetailModal from './components/TaskDetailModal';
import ProfileModal from './components/ProfileModal';
import { 
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, 
  doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, User,
  handleFirestoreError, OperationType, deleteDoc
} from './firebase';
import { writeBatch } from 'firebase/firestore';

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

const cleanObject = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj
      .filter(v => v !== undefined)
      .map(v => cleanObject(v));
  }
  
  const cleaned: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined) {
        const cleanedValue = cleanObject(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
  }
  return cleaned;
};

const AppContent: React.FC = () => {
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
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingFromCloud = useRef(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isScheduledModalOpen, setIsScheduledModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<{id: string, type: 'xp' | 'info', message: string, amount?: number}[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isScheduledHovered, setIsScheduledHovered] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });

  // Check if Firebase is initialized
  if (!auth || !db) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <AlertCircle className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-black mb-4 uppercase tracking-tight">Configuração Pendente</h1>
          <p className="text-slate-400 mb-8 leading-relaxed font-medium">
            O aplicativo não conseguiu inicializar o banco de dados. Isso geralmente acontece quando as variáveis de ambiente do Firebase não foram configuradas no Netlify.
          </p>
          <div className="bg-slate-950 rounded-2xl p-4 mb-8 text-left border border-slate-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">O que fazer:</p>
            <ul className="text-xs text-slate-400 space-y-2 font-medium">
              <li>1. Vá ao painel do Netlify</li>
              <li>2. Site settings › Build & deploy › Environment</li>
              <li>3. Adicione as variáveis VITE_FIREBASE_*</li>
              <li>4. Faça um novo deploy</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all uppercase tracking-widest text-xs"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }
  
  const handleLogin = async () => {
    try {
      setIsSyncing(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.info("Login popup closed by user.");
        return;
      }
      if (error.code === 'auth/popup-blocked') {
        addNotification('info', 'O popup foi bloqueado pelo navegador. Por favor, permita popups para este site.');
        return;
      }
      if (error.code === 'auth/unauthorized-domain') {
        addNotification('info', 'Este domínio não está autorizado no Firebase. Adicione-o nas configurações de autenticação.');
        console.error("Unauthorized domain:", window.location.hostname);
        return;
      }
      if (error.code === 'auth/operation-not-allowed') {
        addNotification('info', 'O login com Google não está habilitado no console do Firebase.');
        return;
      }
      console.error("Login failed:", error);
      addNotification('info', `Falha no login: ${error.message || 'Tente novamente.'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsSyncing(true);
      await signOut(auth);
      setUser(null);
      // Opcional: Limpar estado local ou manter?
      // O usuário pediu para não perder progresso, então manter local é seguro.
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Monitorar estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        setIsSyncing(true);
        const path = `users/${currentUser.uid}`;
        try {
          // Verificar se existe dados no Firestore
          const statsDoc = await getDoc(doc(db, 'users', currentUser.uid));
          
          if (!statsDoc.exists()) {
            // Migrar dados locais para o Firestore no primeiro login
            const localTasks = JSON.parse(localStorage.getItem(STORAGE_KEY_TASKS) || '[]');
            const localStats = JSON.parse(localStorage.getItem(STORAGE_KEY_STATS) || '{}');
            
            if (localTasks.length > 0 || Object.keys(localStats).length > 0) {
              const batch = writeBatch(db);
              
              // Salvar stats
              batch.set(doc(db, 'users', currentUser.uid), cleanObject({
                ...stats,
                ...localStats,
                name: currentUser.displayName || stats.name,
                avatarUrl: currentUser.photoURL || stats.avatarUrl
              }));
              
              // Salvar tasks
              localTasks.forEach((task: Task) => {
                batch.set(doc(db, 'users', currentUser.uid, 'tasks', task.id), cleanObject(task));
              });
              
              await batch.commit();
              addNotification('info', 'Progresso sincronizado com a nuvem!');
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
        } finally {
          setIsSyncing(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Listeners em tempo real para Firestore
  useEffect(() => {
    if (!user) return;

    // Listener para Stats
    const statsPath = `users/${user.uid}`;
    const unsubscribeStats = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        isSyncingFromCloud.current = true;
        setStats(doc.data() as UserStats);
        setTimeout(() => { isSyncingFromCloud.current = false; }, 100);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, statsPath);
    });

    // Listener para Tasks
    const tasksPath = `users/${user.uid}/tasks`;
    const unsubscribeTasks = onSnapshot(collection(db, 'users', user.uid, 'tasks'), (snapshot) => {
      isSyncingFromCloud.current = true;
      const cloudTasks: Task[] = [];
      snapshot.forEach((doc) => {
        cloudTasks.push(doc.data() as Task);
      });
      // Ordenar por 'order'
      setTasks(cloudTasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      setTimeout(() => { isSyncingFromCloud.current = false; }, 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, tasksPath);
    });

    return () => {
      unsubscribeStats();
      unsubscribeTasks();
    };
  }, [user]);

  // Sincronizar mudanças locais para o Firestore
  useEffect(() => {
    if (!user || isSyncingFromCloud.current) return;

    const syncStats = async () => {
      const path = `users/${user.uid}`;
      try {
        await setDoc(doc(db, 'users', user.uid), cleanObject(stats), { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    };

    const timer = setTimeout(syncStats, 1000); // Debounce
    return () => clearTimeout(timer);
  }, [stats, user]);

  // Para tasks, como são muitas, é melhor atualizar individualmente nas funções de ação
  // Mas para garantir, vamos usar um efeito para a lista completa se necessário (por exemplo, reordenação)
  useEffect(() => {
    if (!user || isSyncingFromCloud.current) return;

    // Sincronizar ordens se mudarem drasticamente ou em lote
    // Mas para performance, vamos focar em atualizações pontuais nas funções.
  }, [tasks, user]);

  const updateFirestoreTask = async (task: Task) => {
    if (!user) return;
    const path = `users/${user.uid}/tasks/${task.id}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'tasks', task.id), cleanObject(task));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const deleteFirestoreTask = async (taskId: string) => {
    if (!user) return;
    const path = `users/${user.uid}/tasks/${taskId}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'tasks', taskId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Estados para Mobile e Interação
  const [activeTab, setActiveTab] = useState<TaskStatus>('todo');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
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
              // Nova lógica: volta um nível em vez de zerar
              const newStreak = Math.max(0, (parsedStats.streak || 0) - 1);
              if (newStreak < (parsedStats.streak || 0)) {
                parsedStats.streak = newStreak;
                parsedStats.streakLost = true; // Flag para mostrar 🍃
                
                // Adiciona os dias perdidos
                const lossDays = parsedStats.streakLossDays || [];
                for (let i = 1; i < diffInDays; i++) {
                  const d = new Date(lastActivity.getTime());
                  d.setDate(d.getDate() + i);
                  const dStr = getLocalDateString(d);
                  if (!lossDays.includes(dStr)) lossDays.push(dStr);
                }
                parsedStats.streakLossDays = lossDays;
              }
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

  const updateActivity = useCallback(() => {
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
          newStreak = Math.min(8, newStreak + 1); // Máximo nível 8
        } else if (today.getDay() === 1 && lastActivityDate === dayBeforeYesterdayStr) {
          newStreak = Math.min(8, newStreak + 1);
        } else if (lastActivityDate !== todayStr) {
          // Se passou mais de um dia, a lógica de "voltar nível" já deve ter rodado no carregamento
          // Mas se estamos aqui e não é hoje nem ontem, garantimos o nível 1
          if (newStreak === 0) newStreak = 1;
        }
      }

      return {
        ...prev,
        streak: newStreak,
        streakLost: false, // Recuperou a sequência ou manteve
        lastActivityTimestamp: now,
        activeDays: hasAlreadyActedToday ? activeDays : [...activeDays, todayStr]
      };
    });
  }, []);

  const addNotification = useCallback((type: 'xp' | 'info', message: string, amount?: number) => {
    const id = generateId();
    setNotifications(prev => [...prev, { id, type, message, amount }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);

  const grantXp = useCallback((amount: number, isTask: boolean = true) => {
    setStats(prev => {
      const multiplier = 1 + (prev.streak * 0.005);
      const bonusAmount = Math.round(amount * multiplier);
      
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
  }, [updateActivity]);

  useEffect(() => {
    if (stats.streakLost) {
      addNotification('info', 'Você perdeu sua sequência, sua planta voltou em um nível...');
    }
  }, [stats.streakLost, addNotification]);

  const applyPenalty = useCallback((amount: number) => {
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
  }, []);

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
      tags: [],
      createdAt: taskTimestamp,
      recurrence: data.recurrence || 'none',
      recurrenceEndDate: data.recurrenceEndDate,
      recurrenceDays: data.recurrenceDays,
      order: tasks.length
    };
    setTasks([...tasks, newTask]);
    updateFirestoreTask(newTask);
    setIsModalOpen(false);
    addNotification('info', `Tarefa lançada: ${newTask.title}`);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const taskDayStr = new Date(taskTimestamp).toISOString().split('T')[0];
    if (todayStr === taskDayStr) {
      updateActivity();
    }
  };

  const formatTagDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    const taskToUpdate = tasks.find(t => t.id === id);
    if (updates.status === 'done' && taskToUpdate) {
      const now = new Date();
      const taskDate = new Date(taskToUpdate.createdAt);
      
      // Bloqueio de conclusão futura
      if (taskDate.getTime() > now.getTime() && taskDate.toDateString() !== now.toDateString()) {
        addNotification('info', 'Você não pode concluir jornadas do futuro!');
        return;
      }
    }

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
            grantXp(XP_PER_TASK);

            // Lógica de Recorrência: Criar próxima instância
            if (t.recurrence && t.recurrence !== 'none') {
              const nextDate = new Date(t.createdAt);
              
              if (t.recurrence === 'daily') {
                nextDate.setDate(nextDate.getDate() + 1);
              } else if (t.recurrence === 'weekly') {
                if (t.recurrenceDays && t.recurrenceDays.length > 0) {
                  // Encontrar o próximo dia da semana na lista
                  const currentDay = nextDate.getDay();
                  const sortedDays = [...t.recurrenceDays].sort((a, b) => a - b);
                  const nextDay = sortedDays.find(d => d > currentDay) ?? sortedDays[0];
                  
                  const daysToAdd = nextDay > currentDay ? nextDay - currentDay : 7 - (currentDay - nextDay);
                  nextDate.setDate(nextDate.getDate() + daysToAdd);
                } else {
                  nextDate.setDate(nextDate.getDate() + 7);
                }
              } else if (t.recurrence === 'monthly') {
                if (t.recurrenceDays && t.recurrenceDays.length > 0) {
                  const currentDayOfMonth = nextDate.getDate();
                  const sortedDays = [...t.recurrenceDays].sort((a, b) => a - b);
                  const nextDayOfMonth = sortedDays.find(d => d > currentDayOfMonth);
                  
                  if (nextDayOfMonth) {
                    nextDate.setDate(nextDayOfMonth);
                  } else {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                    nextDate.setDate(sortedDays[0]);
                  }
                } else {
                  nextDate.setMonth(nextDate.getMonth() + 1);
                }
              }

              const shouldCreateNext = !t.recurrenceEndDate || nextDate.getTime() <= t.recurrenceEndDate;
              
              if (shouldCreateNext) {
                setTimeout(() => {
                  const nextTask: Task = {
                    ...t,
                    id: generateId(),
                    status: 'todo',
                    createdAt: nextDate.getTime(), // Âncora na data nominal
                    startedAt: undefined,
                    completedAt: undefined,
                    tags: [],
                  };
                  setTasks(currentTasks => {
                    // Evitar duplicatas se o usuário clicar rápido ou houver lag
                    if (currentTasks.some(ct => ct.title === nextTask.title && ct.createdAt === nextTask.createdAt && ct.status === 'todo')) {
                      return currentTasks;
                    }
                    addNotification('info', `Nova jornada: ${nextTask.title}`);
                    updateFirestoreTask(nextTask);
                    return [...currentTasks, nextTask];
                  });
                }, 500);
              }
            }
          }

          if (t.status === 'done' && updates.status !== 'done') {
            newCompletedAt = undefined;
            newTags = newTags.filter(tag => !tag.startsWith('Terminado em:'));
          }

          const updated = { ...t, ...updates, tags: newTags, startedAt: newStartedAt, completedAt: newCompletedAt };
          updateFirestoreTask(updated);
          return updated;
        }
        return t;
      });
      return updatedTasks;
    });
    setEditingTask(null);
    setIsModalOpen(false);
  }, [grantXp, updateActivity]);

  const cancelRecurrence = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updated = { ...t, recurrence: 'none' as RecurrenceType };
        updateFirestoreTask(updated);
        return updated;
      }
      return t;
    }));
    if (viewingTask?.id === taskId) {
      setViewingTask(prev => prev ? { ...prev, recurrence: 'none' as RecurrenceType } : null);
    }
  }, [viewingTask?.id, user]);

  const deleteTask = useCallback((id: string) => {
    setTaskToDelete(id);
    setIsDeleteConfirmOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (taskToDelete) {
      setTasks(prev => prev.filter(t => t.id !== taskToDelete));
      deleteFirestoreTask(taskToDelete);
      setTaskToDelete(null);
      setIsDeleteConfirmOpen(false);
      setViewingTask(null);
    }
  }, [taskToDelete, user]);

  const onDragStart = useCallback(() => {
    setIsDraggingGlobal(true);
  }, []);

  const onDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;

    setIsDraggingGlobal(false);
    setDragOverStatus(null);

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as TaskStatus;
    const oldStatus = source.droppableId as TaskStatus;

    // Se mudou de coluna no mobile, atualiza a aba ativa
    if (newStatus !== oldStatus) {
      setActiveTab(newStatus);
    }

    setTasks(prev => {
      const newTasks = [...prev];
      const taskIndex = newTasks.findIndex(t => t.id === draggableId);
      if (taskIndex === -1) return prev;

      const [movedTask] = newTasks.splice(taskIndex, 1);
      
      // Se mudou de status, atualiza o status
      if (newStatus !== oldStatus) {
        movedTask.status = newStatus;
        
        // Lógica de conclusão/início (reutilizando parte da lógica de updateTask)
        if (newStatus === 'done' && oldStatus !== 'done') {
          movedTask.completedAt = Date.now();
          const finishTag = `Terminado em: ${formatTagDate(movedTask.completedAt)}`;
          movedTask.tags = movedTask.tags.filter(tag => !tag.startsWith('Terminado em:') && tag !== 'Atrasada');
          movedTask.tags.push(finishTag);
          grantXp(XP_PER_TASK);
          addNotification('xp', `Jornada Concluída! +${XP_PER_TASK} XP`, XP_PER_TASK);
        } else if (newStatus === 'in-progress' && oldStatus === 'todo') {
          movedTask.startedAt = Date.now();
          const startTag = `Começado em: ${formatTagDate(movedTask.startedAt)}`;
          movedTask.tags = movedTask.tags.filter(tag => !tag.startsWith('Começado em:'));
          movedTask.tags.push(startTag);
          addNotification('info', 'Iniciando jornada...');
          updateActivity();
        } else if (oldStatus === 'done' && newStatus !== 'done') {
          movedTask.completedAt = undefined;
          movedTask.tags = movedTask.tags.filter(tag => !tag.startsWith('Terminado em:'));
        }
      }

      // Reordenar dentro da lista filtrada
      // Precisamos encontrar a posição correta no array global
      // Uma forma simples é usar o order, mas como estamos usando splice, 
      // podemos apenas reinserir e depois atualizar todos os orders.
      
      // Encontrar as tarefas que estão na mesma coluna de destino (já filtradas por data no useMemo)
      // Mas aqui estamos no array global.
      // O ideal é que o order seja respeitado.
      
      // Vamos apenas inserir na nova posição e depois recalcular os orders para essa coluna
      // Para simplificar, vamos apenas inserir no array global na posição que faça sentido.
      // Mas o dnd-kit/pangea-dnd trabalha com índices da lista renderizada.
      
      // Pegamos a lista de tarefas da coluna de destino (filtradas)
      const columnTasks = newTasks.filter(t => t.status === newStatus);
      // Inserimos na posição correta em relação às tarefas daquela coluna
      // Mas isso é complexo no array global.
      
      // Estratégia: 
      // 1. Removemos a tarefa do array global (já feito)
      // 2. Encontramos onde inserir no array global para que ela apareça no índice 'destination.index' 
      //    dentro da sub-lista de tarefas com o mesmo status.
      
      let count = 0;
      let insertIndex = newTasks.length;
      for (let i = 0; i < newTasks.length; i++) {
        if (newTasks[i].status === newStatus) {
          if (count === destination.index) {
            insertIndex = i;
            break;
          }
          count++;
        }
      }
      
      newTasks.splice(insertIndex, 0, movedTask);
      
      // Atualizar orders para manter consistência
      const finalTasks = newTasks.map((t, i) => ({ ...t, order: i }));
      
      // Sincronizar em lote se logado
      if (user) {
        const batch = writeBatch(db);
        finalTasks.forEach(t => {
          batch.set(doc(db, 'users', user.uid, 'tasks', t.id), cleanObject(t));
        });
        batch.commit().catch(error => {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/tasks`);
        });
      }

      return finalTasks;
    });
  }, [grantXp, addNotification, updateActivity, tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           t.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // Se não houver data selecionada, o Kanban fica vazio (conforme solicitado)
      if (!selectedDate) return false;

      const filterDate = new Date(selectedDate);
      filterDate.setHours(0, 0, 0, 0);
      const filterTimestamp = filterDate.getTime();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();

      // Determinar qual data usar para o filtro: data de conclusão para tarefas feitas, data de criação para as demais
      const displayTimestamp = (t.status === 'done' && t.completedAt) ? t.completedAt : t.createdAt;
      const taskDate = new Date(displayTimestamp);
      taskDate.setHours(0, 0, 0, 0);
      const taskTimestamp = taskDate.getTime();

      // 1. Caso base: Mesma data
      if (taskTimestamp === filterTimestamp) return true;

      // 2. Tarefas atrasadas (apenas se estivermos vendo "Hoje")
      if (filterTimestamp === todayTimestamp && t.status !== 'done' && taskTimestamp < todayTimestamp) {
        return true;
      }

      // 3. Agendamento Futuro / Recorrência
      // Se a tarefa é recorrente e a data selecionada é futura (ou hoje) em relação à criação
      const creationDate = new Date(t.createdAt);
      creationDate.setHours(0, 0, 0, 0);
      const creationTimestamp = creationDate.getTime();

      if (t.recurrence !== 'none' && filterTimestamp >= creationTimestamp) {
        // Verificar se está dentro do prazo final
        if (t.recurrenceEndDate && filterTimestamp > t.recurrenceEndDate) return false;

        // Se a tarefa já foi concluída, ela não deve aparecer como "recorrente" em dias futuros
        // a menos que seja uma nova instância. Mas como o sistema cria novas instâncias,
        // a instância concluída só deve aparecer no dia que foi concluída.
        if (t.status === 'done') return false;

        // Verificar padrão
        if (t.recurrence === 'daily') return true;
        
        if (t.recurrence === 'weekly' && t.recurrenceDays && t.recurrenceDays.length > 0) {
          return t.recurrenceDays.includes(filterDate.getDay());
        }
        
        if (t.recurrence === 'monthly' && t.recurrenceDays && t.recurrenceDays.length > 0) {
          return t.recurrenceDays.includes(filterDate.getDate());
        }

        // Se for semanal/mensal mas não tiver dias específicos, assume o dia da criação
        if (t.recurrence === 'weekly' && filterDate.getDay() === creationDate.getDay()) return true;
        if (t.recurrence === 'monthly' && filterDate.getDate() === creationDate.getDate()) return true;
      }

      return false;
    }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [tasks, searchQuery, selectedDate]);

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

      <div className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${!isDesktopSidebarOpen ? 'md:w-0 md:opacity-0 md:pointer-events-none' : 'md:w-72 lg:w-80 md:opacity-100'}`}>
        <Sidebar 
          stats={stats} 
          tasks={tasks}
          user={user}
          isSyncing={isSyncing}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onFocusComplete={() => {
            grantXp(20, false);
            setStats(prev => ({ ...prev, focusSessionsCompleted: (prev.focusSessionsCompleted || 0) + 1 }));
          }} 
          onEditProfile={() => setIsProfileModalOpen(true)}
          onShowScheduled={() => setIsScheduledModalOpen(true)}
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
            
            <motion.div 
              className="relative flex items-center"
            >
              <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 h-4 text-slate-400 dark:text-slate-600 pointer-events-none z-10" />
              <motion.input 
                ref={searchInputRef}
                type="text" 
                placeholder="Buscar..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                animate={{ 
                  width: isSearchFocused ? 320 : 48,
                  backgroundColor: isSearchFocused ? 'var(--color-slate-50)' : 'var(--color-slate-100)'
                }}
                whileHover={!isSearchFocused ? { width: 180 } : {}}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="pl-9 md:pl-12 pr-4 py-2 md:py-3 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 text-xs md:text-sm outline-none font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600 overflow-hidden"
              />
            </motion.div>

            <motion.button
              onClick={() => setIsScheduledModalOpen(true)}
              onMouseEnter={() => setIsScheduledHovered(true)}
              onMouseLeave={() => setIsScheduledHovered(false)}
              className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group overflow-hidden h-[38px] md:h-[46px]"
              animate={{ 
                width: isScheduledHovered ? 'auto' : 48,
                paddingLeft: isScheduledHovered ? 16 : 12,
                paddingRight: isScheduledHovered ? 16 : 12,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="relative flex-shrink-0 flex items-center justify-center">
                <Repeat className="w-5 h-5" />
                {tasks.filter(t => t.recurrence && t.recurrence !== 'none').length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                    {tasks.filter(t => t.recurrence && t.recurrence !== 'none').length}
                  </span>
                )}
              </div>
              <AnimatePresence>
                {isScheduledHovered && (
                  <motion.span 
                    initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                    animate={{ opacity: 1, width: 'auto', marginLeft: 8 }}
                    exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                    className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                  >
                    Agendadas
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
          
          <div className="hidden md:flex items-center gap-6 ml-4">
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
            {/* Visor de sequência removido conforme solicitado */}
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

        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <motion.div 
            onPanEnd={(_, info) => {
              if (isDraggingGlobal) return;
              const threshold = 50;
              const velocityThreshold = 0.2;
              
              // Verifica se o movimento foi predominantemente horizontal
              if (Math.abs(info.offset.x) > Math.abs(info.offset.y) * 1.5) {
                const statuses: TaskStatus[] = ['todo', 'in-progress', 'done'];
                const currentIndex = statuses.indexOf(activeTab);
                
                if ((info.offset.x < -threshold || info.velocity.x < -velocityThreshold) && currentIndex < statuses.length - 1) {
                  setActiveTab(statuses[currentIndex + 1]);
                } else if ((info.offset.x > threshold || info.velocity.x > velocityThreshold) && currentIndex > 0) {
                  setActiveTab(statuses[currentIndex - 1]);
                }
              }
            }}
            className={`flex-1 min-h-0 overflow-x-auto overflow-y-hidden flex flex-col md:flex-row p-4 md:p-6 lg:p-8 md:gap-6 lg:gap-10 bg-slate-50 dark:bg-slate-950 touch-pan-y ${isDraggingGlobal ? 'dragging-active' : ''}`}
          >
            {(['todo', 'in-progress', 'done'] as TaskStatus[]).map(status => (
              <Droppable key={status} droppableId={status}>
                {(provided: any, snapshot: any) => (
                  <motion.div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    initial={false}
                    animate={{ 
                      opacity: activeTab === status ? 1 : 0,
                      x: activeTab === status ? 0 : (activeTab === 'todo' ? 20 : -20),
                      display: activeTab === status ? 'flex' : 'none'
                    }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className={`flex-col w-full md:w-[320px] lg:w-[384px] xl:w-[420px] flex-shrink-0 ${isDraggingGlobal ? '' : 'transition-all duration-300'} max-h-full rounded-[2.5rem] md:!flex md:!opacity-100 md:!transform-none ${snapshot.isDraggingOver ? 'bg-indigo-500/5 ring-4 ring-indigo-500/20' : ''}`}
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
                        .map((task, index) => (
                          // @ts-ignore
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided: any, snapshot: any) => {
                              const card = (
                                <TaskCard 
                                  innerRef={provided.innerRef}
                                  provided={provided}
                                  isDragging={snapshot.isDragging}
                                  task={task} 
                                  onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }}
                                  onDelete={deleteTask}
                                  onView={(t) => setViewingTask(t)}
                                  onComplete={(id) => updateTask(id, { status: 'done' })}
                                />
                              );
                              if (snapshot.isDragging) {
                                return ReactDOM.createPortal(card, document.body);
                              }
                              return card;
                            }}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                      {filteredTasks.filter(t => t.status === status).length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-20 select-none">
                           <CheckCircle className="w-12 h-12 mb-4 text-slate-400" />
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nada por aqui ainda</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </Droppable>
            ))}
          </motion.div>
        </DragDropContext>

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
          onDelete={deleteTask}
          onEdit={(task) => {
            setViewingTask(null);
            setEditingTask(task);
            setIsModalOpen(true);
          }}
          onUpdateStatus={(id, status) => {
            updateTask(id, { status });
            setViewingTask(null);
          }}
        />
      )}

      {isProfileModalOpen && (
        <ProfileModal 
          stats={stats}
          theme={theme}
          user={user}
          isSyncing={isSyncing}
          onThemeChange={setTheme}
          onClose={() => setIsProfileModalOpen(false)}
          onSave={updateProfile}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      )}

      {isScheduledModalOpen && (
        <ScheduledTasksModal 
          tasks={tasks}
          onClose={() => setIsScheduledModalOpen(false)}
          onViewTask={(task) => {
            setIsScheduledModalOpen(false);
            setViewingTask(task);
          }}
        />
      )}

      {isDeleteConfirmOpen && (
        <DeleteConfirmModal 
          onConfirm={confirmDelete}
          onCancel={() => {
            setIsDeleteConfirmOpen(false);
            setTaskToDelete(null);
          }}
        />
      )}

      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div 
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.8 }}
              className={`px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 pointer-events-auto
                ${n.type === 'xp' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'}`}
            >
              {n.type === 'xp' ? (
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Zap className="w-4 h-4 text-white fill-white" />
                </div>
              ) : (
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                  <Repeat className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
              )}
              <span className="text-xs font-black uppercase tracking-widest">{n.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const DeleteConfirmModal: React.FC<{onConfirm: () => void, onCancel: () => void}> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[250] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center text-center"
      >
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-3xl flex items-center justify-center text-red-600 dark:text-red-400 mb-6">
          <Trash2 className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-2">Excluir Tarefa?</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8">Esta ação não pode ser desfeita. Todo o progresso desta jornada será perdido.</p>
        
        <div className="grid grid-cols-2 gap-4 w-full">
          <button 
            onClick={onCancel}
            className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-[10px]"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            className="py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-500 transition-all uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20"
          >
            Excluir
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ScheduledTasksModal = React.memo<{tasks: Task[], onClose: () => void, onViewTask: (task: Task) => void}>(({ tasks, onClose, onViewTask }) => {
  const scheduledTasks = tasks.filter(t => t.recurrence && t.recurrence !== 'none');

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh] overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Repeat className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Tarefas Agendadas</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {scheduledTasks.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center opacity-30">
              <CalendarClock className="w-16 h-16 mb-4" />
              <p className="font-black uppercase tracking-widest text-xs">Nenhuma tarefa cíclica</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {scheduledTasks.map(task => (
                <div 
                  key={task.id}
                  onClick={() => onViewTask(task)}
                  className="p-5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-indigo-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{task.title}</h3>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      {task.recurrence === 'daily' ? 'Diária' : task.recurrence === 'weekly' ? 'Semanal' : 'Mensal'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-3">{task.description || 'Sem descrição'}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      <CalendarIcon className="w-3 h-3" />
                      Criada em {new Date(task.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const TaskModal: React.FC<{task: any, onClose: any, onSave: any}> = ({ task, onClose, onSave }) => {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
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
          <h2 className="text-base md:text-lg lg:text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">{task ? 'Editar Tarefa' : 'Lançar Tarefa'}</h2>
          <button onClick={onClose} className="p-2 md:p-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-full transition-all text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          onSave({ 
            title, 
            description, 
            recurrence, 
            recurrenceDays,
            recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate).getTime() : undefined 
          });
        }} className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar">
          <div className="space-y-2 md:space-y-4">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Título da Tarefa</label>
            <input 
              required autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xl md:text-2xl lg:text-3xl font-black placeholder:text-slate-200 dark:placeholder:text-slate-800 text-slate-900 dark:text-slate-100 border-none focus:ring-0 outline-none p-0 tracking-tight bg-transparent"
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
          
          <div className="grid grid-cols-1 gap-6 md:gap-8">
            <div className="space-y-4 md:space-y-5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Repetição</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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

// Componente de Error Boundary
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if ((this as any).state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      try {
        const parsedError = JSON.parse((this as any).state.error.message);
        if (parsedError.error) {
          errorMessage = `Erro no Firebase: ${parsedError.error} (${parsedError.operationType} em ${parsedError.path})`;
        }
      } catch (e) {
        errorMessage = (this as any).state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-4">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Ops! Algo deu errado</h1>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-zinc-100 text-zinc-950 font-semibold rounded-xl hover:bg-white transition-colors"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;
