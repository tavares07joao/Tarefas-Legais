
import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, RotateCcw, 
  ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight,
  Volume2, VolumeX, Volume1,
  Play, Pause, Settings, Flame, X, Music, Plus, Link as LinkIcon, Trash2
} from 'lucide-react';
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
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ stats, tasks, selectedDate, onDateSelect, onFocusComplete, onEditProfile, onCloseMobile }) => {
  const xpNeeded = stats.level * NEXT_LEVEL_XP_BASE;
  const progressPercent = Math.min(100, (stats.xp / xpNeeded) * 100);

  // --- Lógica de Foco ---
  const [duration, setDuration] = useState(10);
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isActive, setIsActive] = useState(false);
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
    localStorage.setItem('gamified-task-master-custom-tracks', JSON.stringify(customTracks));
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
      timerRef.current = window.setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      
      // Trocar música a cada 10 minutos (600 segundos)
      if (timeLeft > 0 && timeLeft % 600 === 0 && timeLeft !== duration * 60) {
        setCurrentTrackIndex(prev => (prev + 1) % allTracks.length);
      }
    } else if (timeLeft === 0) {
      setIsActive(false);
      setIsAudioPlaying(false);
      onFocusComplete();
      resetTimer();
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [isActive, timeLeft]);

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
    <aside className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen flex flex-col overflow-y-auto custom-scrollbar sticky top-0 z-20 shadow-2xl transition-colors duration-300">
      {/* Perfil e XP */}
      <div className="p-6 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm relative group">
        <button 
          onClick={onEditProfile}
          className="absolute top-6 right-6 p-2 bg-white dark:bg-slate-800/50 rounded-xl text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 md:opacity-0 group-hover:opacity-100 transition-all border border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-4 mb-4 cursor-pointer pt-2" onClick={onEditProfile}>
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-md">
              <img 
                src={stats.avatarUrl || "https://api.dicebear.com/7.x/initials/svg?seed=U&backgroundColor=cbd5e1&fontSize=40"} 
                alt="Avatar" 
                className="w-full h-full object-cover opacity-90 dark:opacity-80" 
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-lg flex items-center justify-center text-[8px] text-white font-black">
              {stats.level}
            </div>
          </div>
          <div className="min-w-0">
            <p className="font-black text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">{stats.name || "Usuário"}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest truncate">Rank: Nível {stats.level}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            <span>Experiência</span>
            <span className="text-indigo-600 dark:text-indigo-400">{stats.xp}/{xpNeeded} XP</span>
          </div>
          <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 p-[1.5px]">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(99,102,241,0.4)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Calendário Simplificado */}
      <div className="p-4 mt-2">
        <p className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Histórico de Missões</p>
        <div className="bg-slate-50 dark:bg-slate-950 rounded-[2rem] p-4 md:p-5 border border-slate-200 dark:border-slate-800 shadow-inner transition-colors duration-300">
          <div className="flex justify-between items-center mb-4 md:mb-5">
             <h3 className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest truncate max-w-[140px]">
               {monthLabel}
             </h3>
             <div className="flex gap-1">
                <button onClick={prevMonth} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 dark:text-slate-500">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={nextMonth} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 dark:text-slate-500">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
             </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
             {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} className="h-7" />)}
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
                    className={`h-7 w-7 flex items-center justify-center text-[10px] font-bold rounded-xl transition-all relative
                      ${selected ? 'bg-indigo-600 text-white shadow-lg' : isToday ? 'bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}
                  >
                    {day}
                    {isSunday && (
                      <span className={`absolute -top-1 -right-1 text-[8px] filter drop-shadow-sm ${active ? 'opacity-40 scale-75' : 'opacity-100 animate-pulse'}`}>💤</span>
                    )}
                    {active && (
                      <Flame className="absolute -top-1.5 -right-1.5 w-3 h-3 text-orange-500 fill-orange-500" />
                    )}
                  </button>
               );
             })}
          </div>
        </div>
      </div>

      {/* Foco Widget */}
      <div className="mt-auto p-4 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800/50 pb-8 md:pb-4 transition-colors duration-300">
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-5 border border-slate-200 dark:border-slate-800 shadow-xl relative">
           <div className="flex items-center gap-3 md:gap-4 mb-4">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-100 dark:bg-slate-950 overflow-hidden relative border border-slate-200 dark:border-slate-800 flex-shrink-0">
                 <img 
                    src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmZoaGJ6a2h5eGZtamF5MTU3YXRrMmoxd2Vxc3RvM3Vyc3VkeXp1ZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/0UnQvd0HLMK5MLziSK/giphy.gif" 
                    className={`w-full h-full object-cover transition-all duration-700 ${isActive ? 'opacity-100' : 'opacity-20 grayscale'}`}
                    alt="Focus"
                 />
              </div>
              <div className="flex-1 min-w-0">
                 <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <button 
                          onClick={() => {
                            setShowTrackList(!showTrackList);
                            setShowVolumeSlider(false);
                          }}
                          className="flex items-center gap-1.5 group/track"
                        >
                          <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate max-w-[80px] group-hover/track:text-indigo-500 transition-colors">
                            {currentTrack.name}
                          </h4>
                          <Music className="w-3 h-3 text-slate-400 group-hover/track:text-indigo-500 transition-colors" />
                        </button>

                        {showTrackList && (
                          <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-in slide-in-from-bottom-2">
                            <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Minha Playlist</span>
                              <button 
                                onClick={() => setShowAddTrack(!showAddTrack)}
                                className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {showAddTrack && (
                              <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                                <div className="relative">
                                  <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                  <input 
                                    type="text" 
                                    placeholder="Link do YouTube..." 
                                    value={newTrackUrl}
                                    onChange={(e) => setNewTrackUrl(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                  />
                                </div>
                                <button 
                                  onClick={handleAddTrack}
                                  className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors"
                                >
                                  Adicionar Link
                                </button>
                              </div>
                            )}

                            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                              {allTracks.map((track, idx) => (
                                <button
                                  key={track.id}
                                  onClick={() => {
                                    setCurrentTrackIndex(idx);
                                    setShowTrackList(false);
                                  }}
                                  className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between group/item ${currentTrackIndex === idx ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
                                >
                                  <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className={`text-[10px] font-bold truncate ${currentTrackIndex === idx ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                      {track.name}
                                    </span>
                                    <span className="text-[8px] text-slate-400 dark:text-slate-500 leading-tight truncate">
                                      {track.description || track.url}
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
                      </div>

                      <div className="relative">
                        <button 
                          onClick={() => {
                            setShowVolumeSlider(!showVolumeSlider);
                            setShowTrackList(false);
                          }}
                          className="text-slate-400 hover:text-indigo-500 transition-colors p-1"
                        >
                          {isMuted || volume === 0 ? <VolumeX className="w-3 h-3" /> : volume < 50 ? <Volume1 className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        </button>
                        
                        {showVolumeSlider && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[60] flex flex-col items-center gap-3 animate-in slide-in-from-bottom-2">
                            <div className="h-24 flex items-center">
                              <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={volume} 
                                onChange={(e) => setVolume(parseInt(e.target.value))}
                                className="w-24 h-1.5 accent-indigo-500 cursor-pointer appearance-none bg-slate-200 dark:bg-slate-700 rounded-full"
                                style={{ transform: 'rotate(-90deg)' }}
                              />
                            </div>
                            <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 tabular-nums">{volume}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                   {!isActive && (
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                        <button onClick={() => changeDuration(-10)} className="hover:text-indigo-600 text-slate-400"><ChevronDown className="w-2.5 h-2.5" /></button>
                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 tabular-nums">{duration}m</span>
                        <button onClick={() => changeDuration(10)} className="hover:text-indigo-600 text-slate-400"><ChevronUp className="w-2.5 h-2.5" /></button>
                      </div>
                   )}
                 </div>
                 <p className="text-xl md:text-2xl font-mono font-black text-slate-900 dark:text-slate-100 tabular-nums leading-none">
                   {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                 </p>
              </div>
           </div>

           <MusicEmbed track={currentTrack} isActive={isActive} volume={volume} />

           <div className="flex gap-2 mt-4">
              <button 
                onClick={toggleTimer}
                className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${isActive ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40'}`}
                title="Pressione Espaço para Play/Pause"
              >
                {isActive ? 'Pausar' : 'Iniciar'}
              </button>
              <button onClick={resetTimer} className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl text-slate-400 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors">
                <RotateCcw className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
