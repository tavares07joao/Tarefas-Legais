
import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, RotateCcw, 
  ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight,
  Volume2, VolumeX, Volume1,
  Play, Pause, Settings, Flame, X, Music, Plus, Link as LinkIcon, Trash2, Repeat, CalendarClock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserStats, Task, MusicTrack } from '../types';
import { NEXT_LEVEL_XP_BASE, FOCUS_TRACKS } from '../constants';
import MusicEmbed from './MusicEmbed';

interface SidebarProps {
  stats: UserStats;
  tasks: Task[];
  selectedDate: number | null;
  onDateSelect: (timestamp: number | null) => void;
  onFocusComplete: () => void;
  onEditProfile?: () => void;
  onShowScheduled?: () => void;
  onCloseMobile?: () => void;
}

const GrowingPlant: React.FC<{ stats: UserStats }> = ({ stats }) => {
  const { streak, plantLevel = 0, showStreakLoss } = stats;
  
  const getEmoji = (lvl: number) => {
    if (lvl <= 0) return "🏔️";
    if (lvl === 1) return "🌱";
    if (lvl === 2) return "🌿";
    if (lvl === 3) return "🍀";
    if (lvl === 4) return "🪴";
    if (lvl === 5) return "🌻";
    if (lvl === 6) return "🌳";
    if (lvl === 7) return "🌲";
    return "🌴";
  };

  const currentEmoji = showStreakLoss ? "🍃" : getEmoji(plantLevel);

  return (
    <div className="bg-emerald-500/5 dark:bg-emerald-500/10 rounded-[2rem] p-5 border border-emerald-200/50 dark:border-emerald-900/30 shadow-sm relative overflow-hidden min-h-[160px] flex flex-col group transition-all hover:shadow-lg hover:shadow-emerald-500/5">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-emerald-500/20 transition-colors" />
      
      <div className="flex flex-col items-center text-center mb-4 relative z-10">
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Cuide da sua sequência!</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Continue cuidando da sua sequência para sua plantinha crescer mais...</span>
        </div>
        {streak > 0 && !showStreakLoss && (
          <div className="mt-2 flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">{streak} dias</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentEmoji + (showStreakLoss ? 'loss' : 'normal')}
            initial={{ scale: 0.5, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.5, opacity: 0, y: -10 }}
            whileHover={{ scale: 1.1 }}
            className="flex flex-col items-center"
          >
            <span 
              className="text-6xl cursor-default select-none drop-shadow-xl mb-2"
              title={showStreakLoss ? "Sequência perdida" : `Nível da Planta: ${plantLevel}`}
            >
              {currentEmoji}
            </span>
            
            {showStreakLoss && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <span className="text-[9px] font-black text-rose-500 uppercase tracking-tight block">Você perdeu sua sequência,</span>
                <span className="text-[9px] font-bold text-rose-400 uppercase tracking-tight block">sua planta voltou em um nível...</span>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {plantLevel >= 1 && !showStreakLoss && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 pt-3 border-t border-emerald-200/20 dark:border-emerald-900/20 flex items-center justify-center gap-2"
        >
          <span className="text-[8px] font-black text-emerald-600/60 uppercase tracking-widest">
            {plantLevel >= 8 ? 'Ecossistema Lendário' : plantLevel >= 5 ? 'Floresta Densa' : 'Jardim Florescente'}
          </span>
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(3, plantLevel) }).map((_, i) => (
              <span key={i} className="text-[10px] animate-pulse">✨</span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = React.memo(({ stats, tasks, selectedDate, onDateSelect, onFocusComplete, onEditProfile, onShowScheduled, onCloseMobile }) => {
  const xpNeeded = stats.level * NEXT_LEVEL_XP_BASE;
  const progressPercent = Math.min(100, (stats.xp / xpNeeded) * 100);

  const [xpGains, setXpGains] = useState<{id: number, amount: number}[]>([]);
  const prevXpRef = useRef(stats.xp);
  const prevLevelRef = useRef(stats.level);

  useEffect(() => {
    if (stats.xp > prevXpRef.current || stats.level > prevLevelRef.current) {
      const gain = stats.level > prevLevelRef.current 
        ? (prevLevelRef.current * NEXT_LEVEL_XP_BASE - prevXpRef.current) + stats.xp
        : stats.xp - prevXpRef.current;
      
      if (gain > 0) {
        const id = Date.now();
        setXpGains(prev => [...prev, { id, amount: gain }]);
        setTimeout(() => {
          setXpGains(prev => prev.filter(g => g.id !== id));
        }, 2000);
      }
    }
    prevXpRef.current = stats.xp;
    prevLevelRef.current = stats.level;
  }, [stats.xp, stats.level]);

  // --- Lógica de Foco ---
  const [duration, setDuration] = useState(10);
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isActive, setIsActive] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const durationAtStartRef = useRef<number>(duration * 60);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [customTracks, setCustomTracks] = useState<MusicTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showTrackList, setShowTrackList] = useState(false);
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [newTrackUrl, setNewTrackUrl] = useState('');
  
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const allTracks = [...FOCUS_TRACKS, ...customTracks];
  const currentTrack = allTracks[currentTrackIndex] || FOCUS_TRACKS[0];

  useEffect(() => {
    const saved = localStorage.getItem('gamified-task-master-custom-tracks');
    if (saved) {
      try {
        setCustomTracks(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar trilhas customizadas", e);
      }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('gamified-task-master-custom-tracks', JSON.stringify(customTracks));
    } catch (e) {
      console.error("Erro ao salvar trilhas customizadas", e);
    }
  }, [customTracks]);

  useEffect(() => {
    if (currentTrack.type === 'stream') {
      const audio = new Audio(currentTrack.url); 
      audio.loop = true;
      audio.volume = volume / 100;
      audioRef.current = audio;
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [currentTrackIndex, customTracks]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      if (isActive && isAudioPlaying && !isMuted) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.debug("Erro na reprodução de áudio:", err);
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isActive, isAudioPlaying, isMuted]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
        durationAtStartRef.current = timeLeft;
      }

      timerRef.current = window.setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
        const newTimeLeft = Math.max(0, durationAtStartRef.current - elapsedSeconds);
        
        setTimeLeft(newTimeLeft);

        // Trocar música a cada 10 minutos (600 segundos)
        if (newTimeLeft > 0 && newTimeLeft % 600 === 0 && newTimeLeft !== duration * 60) {
          setCurrentTrackIndex(prev => (prev + 1) % allTracks.length);
        }

        if (newTimeLeft === 0) {
          setIsActive(false);
          setIsAudioPlaying(false);
          onFocusComplete();
          resetTimer();
        }
      }, 1000);
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
      startTimeRef.current = null;
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [isActive]);

  // Atalho de teclado: Barra de Espaço para Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se o usuário estiver digitando em um input ou textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        toggleTimer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]); // Re-adiciona o listener quando o estado isActive muda para manter a função atualizada

  const toggleTimer = () => {
    setIsActive(prev => {
      const newActive = !prev;
      if (newActive) {
        setIsAudioPlaying(true);
      }
      return newActive;
    });
  };
  
  const resetTimer = () => { 
    setIsActive(false); 
    setIsAudioPlaying(false);
    setTimeLeft(duration * 60);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const changeDuration = (delta: number) => {
    if (isActive) return;
    const newDur = Math.max(10, duration + delta);
    setDuration(newDur);
    setTimeLeft(newDur * 60);
  };

  const toggleAudioPlay = () => {
    if (!isActive) return;
    setIsAudioPlaying(!isAudioPlaying);
  };

  const handleAddTrack = () => {
    if (!newTrackUrl) return;

    let type: 'youtube' | 'stream' = 'stream';
    let name = 'Trilha Customizada';

    if (newTrackUrl.includes('youtube.com') || newTrackUrl.includes('youtu.be')) {
      type = 'youtube';
      name = 'YouTube Music';
    }

    const newTrack: MusicTrack = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      url: newTrackUrl,
      type,
      description: 'Adicionado por você'
    };

    setCustomTracks(prev => [...prev, newTrack]);
    setNewTrackUrl('');
    setShowAddTrack(false);
    setCurrentTrackIndex(allTracks.length); // Seleciona a nova trilha
  };

  const removeTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomTracks(prev => prev.filter(t => t.id !== id));
    if (currentTrack.id === id) {
      setCurrentTrackIndex(0);
    }
  };

  // --- Lógica do Mini Calendário ---
  const [navDate, setNavDate] = useState(new Date());
  const today = new Date();

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const currentYear = navDate.getFullYear();
  const currentMonth = navDate.getMonth();
  const daysCount = getDaysInMonth(currentYear, currentMonth);
  const startDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => setNavDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setNavDate(new Date(currentYear, currentMonth + 1, 1));
  const monthLabel = navDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false;
    const date = new Date(selectedDate);
    return date.getDate() === day && 
           date.getMonth() === currentMonth && 
           date.getFullYear() === currentYear;
  };

  const isDateActive = (day: number) => {
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return stats.activeDays?.includes(dateStr);
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth, day).getTime();
    if (isDateSelected(day)) {
      onDateSelect(null);
    } else {
      onDateSelect(clickedDate);
    }
  };

  return (
    <aside className="w-full bg-slate-50 dark:bg-slate-950 h-screen flex flex-col overflow-y-auto custom-scrollbar sticky top-0 z-20 transition-colors duration-300 border-r border-slate-200 dark:border-slate-800">
      <div className="p-4 space-y-4">
        {/* Perfil e XP Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          
          <button 
            onClick={onEditProfile}
            className="absolute top-4 right-4 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all border border-slate-200 dark:border-slate-700/50"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4 mb-5 cursor-pointer" onClick={onEditProfile}>
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-white dark:border-slate-700 shadow-xl">
                <img 
                  src={stats.avatarUrl || "https://api.dicebear.com/7.x/initials/svg?seed=U&backgroundColor=cbd5e1&fontSize=40"} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 border-2 border-white dark:border-slate-900 rounded-lg flex items-center justify-center text-[10px] text-white font-black shadow-lg">
                {stats.level}
              </div>
            </div>
            <div className="min-w-0">
              <p className="font-black text-slate-900 dark:text-slate-100 text-base leading-tight truncate">{stats.name || "Usuário"}</p>
            </div>
          </div>

          <div className="space-y-2.5 relative">
            <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              <span>Progresso de Nível</span>
              <div className="flex items-center gap-2 relative">
                <AnimatePresence>
                  {xpGains.map(gain => (
                    <motion.span
                      key={gain.id}
                      initial={{ opacity: 0, y: 0, scale: 0.5 }}
                      animate={{ opacity: 1, y: -20, scale: 1.2 }}
                      exit={{ opacity: 0 }}
                      className="absolute right-0 text-emerald-500 font-black"
                    >
                      +{gain.amount}
                    </motion.span>
                  ))}
                </AnimatePresence>
                <span className="text-indigo-600 dark:text-indigo-400">{stats.xp}/{xpNeeded} XP</span>
              </div>
            </div>
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 p-[2px]">
              <motion.div 
                animate={{ scale: xpGains.length > 0 ? [1, 1.02, 1] : 1 }}
                className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 bg-[length:200%_100%] animate-[shimmer_2s_infinite_linear] rounded-full transition-all duration-700 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Calendário Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-4">
             <div className="flex flex-col">
               <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Calendário</span>
               <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight truncate max-w-[140px]">
                 {monthLabel}
               </h3>
             </div>
             <div className="flex gap-1">
                <button onClick={prevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 dark:text-slate-500 border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={nextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 dark:text-slate-500 border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                  <ChevronRight className="w-4 h-4" />
                </button>
             </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1">
             {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, idx) => (
               <div key={`${d}-${idx}`} className="h-6 flex items-center justify-center text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase">{d}</div>
             ))}
             {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} className="h-8" />)}
             {Array.from({ length: daysCount }).map((_, i) => {
               const day = i + 1;
               const d = new Date(currentYear, currentMonth, day);
               const isSunday = d.getDay() === 0;
               const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
               const selected = isDateSelected(day);
               const active = isDateActive(day);

               return (
                  <button 
                    key={day} 
                    onClick={() => handleDayClick(day)}
                    className={`h-8 w-8 flex items-center justify-center text-[10px] font-bold rounded-xl transition-all relative group/day
                      ${selected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40' : isToday ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}
                  >
                    {day}
                    {isSunday && !active && (
                      <span className="absolute -top-1 -right-1 text-[8px] opacity-40">💤</span>
                    )}
                    {active && (
                      <Flame className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 text-orange-500 fill-orange-500 animate-pulse" />
                    )}
                  </button>
               );
             })}
          </div>
        </div>

        {/* Jardim de Sequência */}
        <GrowingPlant stats={stats} />

        {/* Foco Widget Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative transition-all duration-300">
           <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 blur-2xl" />
           
           <div className="p-4">
             <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Modo Foco</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isActive ? 'Ativo' : 'Ocioso'}</span>
                </div>
             </div>

             <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-950 overflow-hidden relative border border-slate-200 dark:border-slate-800 flex-shrink-0 shadow-inner">
                   <img 
                      src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmZoaGJ6a2h5eGZtamF5MTU3YXRrMmoxd2Vxc3RvM3Vyc3VkeXp1ZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/0UnQvd0HLMK5MLziSK/giphy.gif" 
                      className={`w-full h-full object-cover transition-all duration-700 ${isActive ? 'opacity-100 scale-110' : 'opacity-20 grayscale scale-100'}`}
                      alt="Focus"
                   />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                       <div className="flex items-center gap-0.5">
                         <button 
                           onClick={() => {
                             setShowTrackList(!showTrackList);
                             setShowVolumeSlider(false);
                           }}
                           className={`p-1 rounded-lg transition-all ${showTrackList ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                           title="Mudar Trilha"
                         >
                           <Music className="w-3 h-3" />
                         </button>
                         <button 
                           onClick={() => {
                             setShowVolumeSlider(!showVolumeSlider);
                             setShowTrackList(false);
                           }}
                           className={`p-1 rounded-lg transition-all ${showVolumeSlider ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                           title="Ajustar Volume"
                         >
                           {isMuted || volume === 0 ? <VolumeX className="w-3 h-3" /> : volume < 50 ? <Volume1 className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                         </button>
                       </div>
                       <div className="flex items-center gap-1">
                         {!isActive && (
                           <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                             <button onClick={() => changeDuration(-10)} className="hover:text-indigo-600 text-slate-300 dark:text-slate-700 transition-colors"><ChevronDown className="w-2.5 h-2.5" /></button>
                             <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 tabular-nums">{duration}m</span>
                             <button onClick={() => changeDuration(10)} className="hover:text-indigo-600 text-slate-300 dark:text-slate-700 transition-colors"><ChevronUp className="w-2.5 h-2.5" /></button>
                           </div>
                         )}
                       </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xl font-mono font-black text-slate-900 dark:text-slate-100 tabular-nums leading-none">
                        {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
                        {currentTrack.name}
                      </span>
                    </div>
                </div>
             </div>

             {/* Seção de Volume Expansível */}
             {showVolumeSlider && (
               <div className="mb-5 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-300">
                 <div className="flex items-center gap-4">
                   <div className="flex-1">
                     <div className="flex justify-between mb-2">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Volume</span>
                       <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{volume}%</span>
                     </div>
                     <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={volume} 
                        onChange={(e) => setVolume(parseInt(e.target.value))}
                        className="w-full h-1.5 accent-indigo-500 cursor-pointer appearance-none bg-slate-200 dark:bg-slate-800 rounded-full"
                      />
                   </div>
                   <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-2 rounded-xl transition-colors ${isMuted ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30' : 'bg-white dark:bg-slate-800 text-slate-400'}`}
                   >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                   </button>
                 </div>
               </div>
             )}

             {/* Seção de Playlist Expansível */}
             {showTrackList && (
               <div className="mb-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in slide-in-from-top-2 duration-300">
                  <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Playlist</span>
                    <button 
                      onClick={() => setShowAddTrack(!showAddTrack)}
                      className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {showAddTrack && (
                    <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-2">
                      <div className="relative">
                        <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="URL do YouTube..." 
                          value={newTrackUrl}
                          onChange={(e) => setNewTrackUrl(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <button 
                        onClick={handleAddTrack}
                        className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors"
                      >
                        Adicionar
                      </button>
                    </div>
                  )}

                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                    {allTracks.map((track, idx) => (
                      <button
                        key={track.id}
                        onClick={() => {
                          setCurrentTrackIndex(idx);
                          setShowTrackList(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center justify-between group/item ${currentTrackIndex === idx ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className={`text-[10px] font-bold truncate ${currentTrackIndex === idx ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>
                            {track.name}
                          </span>
                        </div>
                        {idx >= FOCUS_TRACKS.length && (
                          <button 
                            onClick={(e) => removeTrack(track.id, e)}
                            className="p-1.5 opacity-0 group-hover/item:opacity-100 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </button>
                    ))}
                  </div>
               </div>
             )}

             <MusicEmbed track={currentTrack} isActive={isActive} volume={volume} />

             <div className="flex gap-2">
                <button 
                  onClick={toggleTimer}
                  className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg ${isActive ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 shadow-amber-100 dark:shadow-none' : 'bg-indigo-600 text-white shadow-indigo-200 dark:shadow-none hover:bg-indigo-700'}`}
                >
                  {isActive ? 'Pausar' : 'Focar Agora'}
                </button>
                <button onClick={resetTimer} className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 transition-colors">
                  <RotateCcw className="w-4 h-4" />
                </button>
             </div>
           </div>
        </div>
        <div className="mt-auto p-6 flex justify-center">
          <span className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.3em] select-none">
            v.B1.03
          </span>
        </div>
      </div>
    </aside>
  );
});

export default Sidebar;
