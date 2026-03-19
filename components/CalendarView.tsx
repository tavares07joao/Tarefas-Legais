
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, MoreHorizontal } from 'lucide-react';
import { Task } from '../types';

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onTaskClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const startDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });

  const totalDays = daysInMonth(year, month);
  const startDay = startDayOfMonth(year, month);
  
  const calendarDays = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    calendarDays.push(i);
  }

  const getTasksForDay = (day: number) => {
    return tasks.filter(task => {
      const d = new Date(task.createdAt);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="h-full flex flex-col p-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 capitalize tracking-tight">{monthName} <span className="text-indigo-600">{year}</span></h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Visão Mensal de Jornada</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
            Hoje
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
          {weekdayNames.map(day => (
            <div key={day} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-7 auto-rows-fr">
          {calendarDays.map((day, idx) => {
            const dayTasks = day ? getTasksForDay(day) : [];
            const today = day ? isToday(day) : false;

            return (
              <div 
                key={idx} 
                className={`min-h-[100px] border-r border-b border-slate-50 p-3 flex flex-col gap-2 transition-colors hover:bg-slate-50/80 group ${idx % 7 === 6 ? 'border-r-0' : ''}`}
              >
                {day && (
                  <>
                    <div className="flex justify-between items-start">
                      <span className={`text-sm font-black w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${today ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 group-hover:text-slate-600'}`}>
                        {day}
                      </span>
                      {dayTasks.length > 0 && (
                        <div className="flex items-center gap-1">
                           <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                           <span className="text-[10px] font-black text-indigo-500">{dayTasks.length}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar max-h-24">
                      {dayTasks.map(task => (
                        <button 
                          key={task.id}
                          onClick={() => onTaskClick(task)}
                          className="text-left px-2 py-1.5 rounded-lg bg-indigo-50/50 hover:bg-indigo-100/50 border border-indigo-100/30 transition-all flex items-center gap-2"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          <span className="text-[10px] font-bold text-slate-700 truncate">{task.title}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
