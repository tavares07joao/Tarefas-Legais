
import React, { useState, useEffect, useRef } from 'react';
import { Task } from '../types';
import { Edit2, Trash2, Calendar, AlignLeft, AlertTriangle, PlayCircle, CheckCircle, Repeat } from 'lucide-react';
import { PRIORITY_CONFIG } from '../constants';

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onView: (task: Task) => void;
  onComplete?: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = React.memo(({ task, onDragStart, onDragEnd, onEdit, onDelete, onView, onComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showLocalConfetti, setShowLocalConfetti] = useState(false);

  useEffect(() => {
    // Verifica se a tarefa foi concluída recentemente (nos últimos 1.5 segundos)
    // Isso garante que a animação rode mesmo após o remount na coluna "Pronto"
    const isJustCompleted = task.status === 'done' && task.completedAt && (Date.now() - task.completedAt < 1500);
    
    if (isJustCompleted) {
      setShowLocalConfetti(true);
      const timer = setTimeout(() => setShowLocalConfetti(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [task.status, task.completedAt]);
  
  const priority = PRIORITY_CONFIG[task.priority];
  const dateStr = new Date(task.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  
  const taskDate = new Date(task.createdAt);
  taskDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - taskDate.getTime();
  const delayDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const isOverdue = task.status !== 'done' && delayDays > 0;
  const xpPenalty = isOverdue ? delayDays * 10 : 0;

  const isDelayed = task.tags.includes('Atrasada') || isOverdue;
  const isRecurring = task.recurrence && task.recurrence !== 'none';

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart(e, task.id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd();
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onComplete) {
      onComplete(task.id);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onView(task)}
      className={`group p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border transition-all duration-300 cursor-pointer active:scale-[0.98] select-none relative overflow-hidden touch-pan-y flex flex-col min-h-[180px] md:min-h-[200px]
        /* Classes Base */
        bg-white dark:bg-slate-900 shadow-xl transition-colors duration-300
        /* Estilo de Arraste (Local) */
        ${isDragging ? 'is-dragging-locally opacity-20 scale-95 border-indigo-500 shadow-2xl z-[50]' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50'}
        /* Estilo quando OUTRO card está sendo arrastado (Global) */
        [.dragging-active_&]:not(.is-dragging-locally):blur-[1px] [.dragging-active_&]:not(.is-dragging-locally):opacity-40
        /* Atraso */
        ${isDelayed && !isDragging ? 'border-rose-500 dark:border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.2)] dark:shadow-[0_0_30px_rgba(244,63,94,0.3)] ring-2 ring-rose-500/10' : ''}
      `}
    >
      {showLocalConfetti && (
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-sm opacity-0"
              style={{
                backgroundColor: ['#6366f1', '#a855f7', '#10b981', '#fbbf24', '#f43f5e', '#06b6d4'][i % 6],
                animation: `confetti-jump-${i} 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
              }}
            />
          ))}
          <div className="absolute bottom-0 left-0 h-1.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-[underline-slide_0.6s_ease-out_forwards]" />
          <style>{`
            @keyframes underline-slide {
              0% { width: 0; opacity: 1; }
              60% { width: 100%; opacity: 1; }
              100% { width: 100%; opacity: 0; }
            }
            ${Array.from({ length: 24 }).map((_, i) => {
              const angle = (i * 15) * (Math.PI / 180);
              const velocity = 50 + Math.random() * 60;
              const x = Math.cos(angle) * velocity;
              const y = Math.sin(angle) * velocity - 30;
              return `
                @keyframes confetti-jump-${i} {
                  0% { transform: translate(0, 0) rotate(0deg) scale(0); opacity: 0; }
                  10% { opacity: 1; scale: 1.2; }
                  100% { transform: translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${Math.random() * 720}deg) scale(0.3); opacity: 0; }
                }
              `;
            }).join('')}
          `}</style>
        </div>
      )}
      {isDelayed && (
        <div className="absolute inset-0 bg-rose-500/5 dark:bg-rose-500/10 pointer-events-none" />
      )}
      <div className="flex justify-between items-start mb-3 md:mb-4 relative z-10">
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border flex items-center gap-1 md:gap-1.5 ${priority.color}`}>
            {priority.icon}
            {priority.label}
          </span>
          {isDelayed && (
            <span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full bg-rose-600 text-white flex items-center gap-1.5 shadow-xl animate-pulse border border-rose-400/50">
              {isOverdue ? '💣' : <AlertTriangle className="w-3.5 h-3.5" />}
              {isOverdue ? `${delayDays} ${delayDays === 1 ? 'dia' : 'dias'} de atraso (-${xpPenalty} XP)` : 'Atrasada'}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1.5">
          {task.status !== 'done' && (
            <button 
              onClick={handleComplete}
              className="p-2 md:p-1.5 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400 transition-colors border border-emerald-200 dark:border-emerald-800/50"
              title="Concluir Tarefa"
            >
              <CheckCircle className="w-3.5 h-3.5 md:w-3 md:h-3" />
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="p-2 md:p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border border-slate-200 dark:border-slate-700"
            title="Editar Tarefa"
          >
            <Edit2 className="w-3.5 h-3.5 md:w-3 md:h-3" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className="p-2 md:p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/40 rounded-xl text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors border border-slate-200 dark:border-slate-700"
            title="Excluir Tarefa"
          >
            <Trash2 className="w-3.5 h-3.5 md:w-3 md:h-3" />
          </button>
        </div>
      </div>

      <h4 className={`font-bold mb-2 break-words leading-tight tracking-tight text-base md:text-lg relative z-10 transition-colors flex-1
        ${isDelayed ? 'text-rose-600 dark:text-rose-50' : 'text-slate-800 dark:text-slate-100'}`}>
        {task.title}
      </h4>
      
      {task.description && (
        <div className="flex gap-2 mb-3 md:mb-4 bg-slate-50 dark:bg-slate-950/30 p-2.5 md:p-3 rounded-xl md:rounded-2xl border border-slate-100 dark:border-slate-800/50 relative z-10 transition-colors">
          <AlignLeft className="w-3 h-3 text-slate-400 dark:text-slate-600 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-500 break-words leading-relaxed italic">
            {task.description}
          </p>
        </div>
      )}

      {/* Tags de Tempo Automáticas Mobile-optimized */}
      <div className="flex flex-wrap gap-1.5 mb-3 md:mb-4 relative z-10">
        {task.tags.filter(tag => tag.includes('em:')).map(tag => {
          const isStart = tag.includes('Começado');
          return (
            <span key={tag} className={`text-[7px] md:text-[8px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 uppercase tracking-tighter 
              ${isStart ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30' : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'}`}>
              {isStart ? <PlayCircle className="w-2.5 h-2.5" /> : <CheckCircle className="w-2.5 h-2.5" />}
              {tag}
            </span>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-3 md:pt-4 border-t border-slate-100 dark:border-slate-800/50 relative z-10 transition-colors">
        <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          <Calendar className="w-3 h-3" />
          {dateStr}
        </div>
        <div className="flex items-center gap-1.5">
          {isRecurring && <Repeat className="w-3 h-3 text-indigo-400 dark:text-indigo-500/50" />}
          <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[9px] md:text-[10px] font-black text-indigo-600 dark:text-indigo-400 transition-colors">
            XP
          </div>
        </div>
      </div>
    </div>
  );
});

export default TaskCard;
