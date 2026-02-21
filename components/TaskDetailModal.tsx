
import React from 'react';
import { X, Calendar, Clock, AlertTriangle, AlignLeft, PlayCircle, CheckCircle, Repeat, Trash } from 'lucide-react';
import { Task } from '../types';
import { PRIORITY_CONFIG, STATUS_CONFIG } from '../constants';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onCancelRecurrence?: (taskId: string) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onCancelRecurrence }) => {
  const priority = PRIORITY_CONFIG[task.priority];
  const status = STATUS_CONFIG[task.status];
  const createdAtStr = new Date(task.createdAt).toLocaleString('pt-BR');
  const isDelayed = task.tags.includes('Atrasada');
  const isRecurring = task.recurrence && task.recurrence !== 'none';

  const getRecurrenceLabel = () => {
    switch(task.recurrence) {
      case 'daily': return 'Diária';
      case 'weekly': {
        if (task.recurrenceDays && task.recurrenceDays.length > 0) {
          const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
          return `Semanal (${task.recurrenceDays.map(d => days[d]).join(', ')})`;
        }
        return 'Semanal';
      }
      case 'monthly': {
        if (task.recurrenceDays && task.recurrenceDays.length > 0) {
          return `Mensal (Dia ${task.recurrenceDays.sort((a,b) => a-b).join(', ')})`;
        }
        return 'Mensal';
      }
      default: return 'Nenhuma';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 rounded-[3rem] w-full max-w-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-10 py-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${status.bgColor} border ${status.borderColor}`}>
              {status.icon}
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">{status.label}</h2>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Detalhes da Tarefa</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-all text-slate-400 border border-slate-700 active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar">
          {/* Status e Prioridade */}
          <div className="flex flex-wrap gap-4">
            <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border flex items-center gap-2 ${priority.color}`}>
              {priority.icon}
              Prioridade {priority.label}
            </span>
            {isDelayed && (
              <span className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full bg-rose-500 text-white border border-rose-400 flex items-center gap-2 animate-pulse shadow-lg shadow-rose-900/40">
                <AlertTriangle className="w-4 h-4 fill-white/20" />
                Tarefa Atrasada
              </span>
            )}
            {isRecurring && (
              <span className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full bg-indigo-900/40 text-indigo-400 border border-indigo-800/50 flex items-center gap-2">
                <Repeat className="w-4 h-4" />
                Repetição {getRecurrenceLabel()}
              </span>
            )}
          </div>

          {/* Título */}
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-100 tracking-tight leading-none">
              {task.title}
            </h1>
          </div>

          {/* Descrição */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-500">
              <AlignLeft className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Instruções Completas</span>
            </div>
            <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-[2rem] min-h-[150px]">
              {task.description ? (
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                  {task.description}
                </p>
              ) : (
                <p className="text-slate-600 italic">Sem instruções detalhadas para esta tarefa.</p>
              )}
            </div>
          </div>

          {/* Seção de Recorrência */}
          {isRecurring && (
            <div className="bg-indigo-950/20 border border-indigo-900/30 p-8 rounded-[2rem] space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                   <div className="flex items-center gap-2 text-indigo-400">
                    <Repeat className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Esta é uma tarefa cíclica</span>
                  </div>
                  <p className="text-xs text-slate-400">Uma nova instância será criada automaticamente em cada ciclo de {getRecurrenceLabel().toLowerCase()}.</p>
                </div>
                {onCancelRecurrence && (
                  <button 
                    onClick={() => { onCancelRecurrence(task.id); onClose(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-900/20 text-rose-400 border border-rose-900/30 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-900/40 transition-colors"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    Cancelar Ciclo
                  </button>
                )}
              </div>
              {task.recurrenceEndDate && (
                <div className="pt-4 border-t border-indigo-900/20">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ciclo encerra em: </span>
                  <span className="text-xs font-bold text-slate-300">{new Date(task.recurrenceEndDate).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>
          )}

          {/* Cronologia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950/30 border border-slate-800/50 p-6 rounded-[2rem] space-y-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Lançamento</span>
              </div>
              <p className="text-sm font-bold text-slate-200">{createdAtStr}</p>
            </div>

            <div className="bg-slate-950/30 border border-slate-800/50 p-6 rounded-[2rem] space-y-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Status Temporal</span>
              </div>
              <div className="space-y-2">
                {task.tags.filter(tag => tag.includes('em:')).map(tag => {
                  const isStart = tag.includes('Começado');
                  return (
                    <div key={tag} className={`flex items-center gap-2 text-xs font-bold ${isStart ? 'text-blue-400' : 'text-emerald-400'}`}>
                      {isStart ? <PlayCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      {tag}
                    </div>
                  );
                })}
                {!task.startedAt && <p className="text-xs text-slate-600 italic">Ainda não iniciada</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="px-10 py-6 border-t border-slate-800 bg-slate-950/30 flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-slate-800 text-slate-300 font-black rounded-2xl hover:bg-slate-700 transition-all uppercase tracking-widest text-[10px] border border-slate-700"
          >
            Fechar Visualização
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
