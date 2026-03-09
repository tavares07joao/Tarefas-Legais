
import React, { useState, useRef } from 'react';
import { X, Camera, Save, User, Moon, Sun, Upload } from 'lucide-react';
import { UserStats } from '../types';

interface ProfileModalProps {
  stats: UserStats;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onClose: () => void;
  onSave: (data: Partial<UserStats>) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = React.memo(({ stats, theme, onThemeChange, onClose, onSave }) => {
  const [name, setName] = useState(stats.name || 'Usuário');
  const [avatarUrl, setAvatarUrl] = useState(stats.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=U&backgroundColor=cbd5e1&fontSize=40');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, avatarUrl });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="px-10 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/30">
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">Configurações</h2>
          <button onClick={onClose} className="p-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-full transition-all text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8 overflow-y-auto custom-scrollbar">
          {/* Avatar Preview Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-32 h-32 rounded-[2.5rem] bg-slate-100 dark:bg-slate-800 overflow-hidden border-4 border-indigo-500 shadow-2xl shadow-indigo-900/20">
                <img 
                  src={avatarUrl} 
                  alt="Preview Avatar" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/error/100'; }}
                />
              </div>
              <div className="absolute -bottom-2 -right-2 p-3 bg-indigo-600 rounded-2xl border-4 border-white dark:border-slate-900 text-white shadow-lg">
                <Camera className="w-5 h-5" />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
            </div>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:opacity-80 transition-opacity"
            >
              <Upload className="w-3 h-3" />
              Trocar Foto
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                <User className="w-3 h-3" /> Nome de Herói
              </label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm font-bold text-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                placeholder="Como quer ser chamado?"
              />
            </div>

            {/* Conquistas */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                Conquistas Desbloqueadas
              </label>
              <div className="grid grid-cols-2 gap-3">
                {stats.achievements && stats.achievements.length > 0 ? (
                  stats.achievements.map(achievement => (
                    <div 
                      key={achievement.id}
                      className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex flex-col items-center text-center gap-2 animate-in zoom-in duration-300"
                    >
                      <span className="text-3xl">{achievement.icon}</span>
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">{achievement.title}</h4>
                        <p className="text-[8px] text-slate-500 dark:text-slate-500 font-bold leading-tight">{achievement.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 py-8 bg-slate-50 dark:bg-slate-950/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center opacity-50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma conquista ainda</p>
                  </div>
                )}
              </div>
            </div>

            {/* Seção de Tema (Aparência) - Agora no final */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                Aparência
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onThemeChange('light')}
                  className={`flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all font-bold text-sm
                    ${theme === 'light' 
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-200' 
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}
                >
                  <Sun className="w-4 h-4" />
                  Modo Claro
                </button>
                <button
                  type="button"
                  onClick={() => onThemeChange('dark')}
                  className={`flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all font-bold text-sm
                    ${theme === 'dark' 
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-900/40' 
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
                >
                  <Moon className="w-4 h-4" />
                  Modo Escuro
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-500 shadow-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-xs border border-indigo-500">
            <Save className="w-4 h-4" />
            Salvar Alterações
          </button>
        </form>
      </div>
    </div>
  );
});

export default ProfileModal;
