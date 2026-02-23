"use client";

import { TaskTimer } from "@/components/TaskTimer";
import { TaskInput } from "@/components/TaskInput";
import { TaskStack } from "@/components/TaskStack";
// import { BacklogList } from "@/components/BacklogList";
import { BacklogPanel } from "@/components/BacklogPanel";
import { RecurringTasks } from "@/components/RecurringTasks";
import { HistoryView } from "@/components/HistoryView";
import { TaskLogModal } from "@/components/TaskLogModal";
import { TaskTableView } from "@/components/TaskTableView";
import { ColorSettingsModal } from "@/components/ColorSettingsModal";
import { useState } from "react";
/* New Components */
import { DraggablePanel } from "@/components/DraggablePanel";
import { useTaskStore } from "@/store/useTaskStore";

/* Icons */
import { RotateCcw, Plus, Play, List, Layers, Settings, ListPlus, Table, ListTodo } from 'lucide-react';

export default function Home() {
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isStackExpanded, setStackExpanded] = useState(false);
  const [isColorSettingsOpen, setIsColorSettingsOpen] = useState(false);
  const [isTaskTableOpen, setIsTaskTableOpen] = useState(false);
  const [draggedDockId, setDraggedDockId] = useState<string | null>(null);

  const backlogCategories = useTaskStore((state) => state.backlogCategories);
  const addBacklogCategory = useTaskStore((state) => state.addBacklogCategory);
  const isRecurringMinimized = useTaskStore((state) => state.isRecurringMinimized);
  const isHistoryMinimized = useTaskStore((state) => state.isHistoryMinimized);
  const toggleRecurringMinimized = useTaskStore((state) => state.toggleRecurringMinimized);
  const toggleHistoryMinimized = useTaskStore((state) => state.toggleHistoryMinimized);
  const historyCount = useTaskStore((state) => state.history.length);

  return (
    <main className="min-h-screen relative p-8 pb-32 overflow-hidden flex flex-col bg-slate-950 text-slate-200 selection:bg-blue-500/30">
      {/* Brand */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 opacity-50 font-bold tracking-widest text-sm z-10 text-slate-500 pointer-events-none">
        TIMETASKDECK
      </div>

      {/* Control Panel (Input + List Button) */}
      <DraggablePanel
        id="control-panel"
        defaultPosition={{ top: 32, left: 32 }}
        defaultSize={{ width: 400, height: 160 }}
        minSize={{ width: 400, height: 160 }}
        title="Control Panel"
      >
        <div className="p-4 flex flex-col gap-4 h-full justify-center">
          <TaskInput />
          <div className="flex justify-between items-center mt-2">
            <div className="flex gap-2">
              <button
                onClick={() => addBacklogCategory()}
                className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 hover:bg-slate-700/50 rounded text-xs text-slate-400 hover:text-white transition-colors border border-slate-700"
              >
                <ListPlus size={14} />
                <span>Add Backlog</span>
              </button>
              <button
                onClick={() => setIsTaskTableOpen(true)}
                className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 hover:bg-slate-700/50 rounded text-xs text-slate-400 hover:text-white transition-colors border border-slate-700"
              >
                <Table size={14} />
                <span>Table View</span>
              </button>
              <button
                onClick={() => setIsColorSettingsOpen(true)}
                className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 hover:bg-slate-700/50 rounded text-xs text-slate-400 hover:text-white transition-colors border border-slate-700"
              >
                <Settings size={14} />
                <span>Colors</span>
              </button>
            </div>
            <button
              onClick={() => setIsLogOpen(true)}
              className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 hover:bg-slate-700/50 rounded text-xs text-slate-400 hover:text-white transition-colors border border-slate-700 hover:border-slate-500"
            >
              <List size={14} />
              <span>Timelog</span>
            </button>
          </div>
        </div>
      </DraggablePanel>

      {/*- カレントタスクデッキ (`TaskTimer`, `TaskStack`): 現在実行中のタスクと一時的にスタックに積んだ背面に並んだタスクの一覧*/}
      <DraggablePanel
        id="timer-panel"
        defaultPosition={{ top: 120, left: 300 }} // Safe default, center logic handled on client if needed
        defaultSize={{ width: 500, height: 500 }}
        title="カレントタスクデッキ"
        resizable={false}
        className="!bg-transparent !shadow-none !border-none"
        headerControls={
          <button
            onClick={() => setStackExpanded(!isStackExpanded)}
            className={`p-1 rounded hover:bg-slate-700/50 transition-colors ${isStackExpanded ? 'text-blue-400 bg-slate-800' : 'text-slate-400'}`}
            title="Toggle Stack View"
          >
            <Layers size={16} />
          </button>
        }
      >
        <div className="relative w-full h-full flex items-end justify-center pb-8">
          <TaskStack isExpanded={isStackExpanded} onToggle={setStackExpanded} />
          <div className={`scale-90 origin-bottom transition-opacity duration-300 ${isStackExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <TaskTimer />
          </div>
        </div>
      </DraggablePanel>

      {/* Deck Bar (Always visible) */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center gap-3 z-40 pointer-events-none px-4">
        <div className="flex flex-wrap justify-center gap-2 max-w-4xl">
          {backlogCategories.map(category => (
            <button
              key={category.id}
              onClick={() => useTaskStore.getState().toggleBacklogMinimized(category.id)}
              draggable
              onDragStart={(e) => {
                setDraggedDockId(category.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (!draggedDockId || draggedDockId === category.id) return;
                const startIndex = backlogCategories.findIndex(c => c.id === draggedDockId);
                const endIndex = backlogCategories.findIndex(c => c.id === category.id);
                useTaskStore.getState().reorderBacklogCategories(startIndex, endIndex);
                setDraggedDockId(null);
              }}
              onDragEnd={() => setDraggedDockId(null)}
              className={`pointer-events-auto flex items-center gap-2 px-4 py-2 backdrop-blur-md border rounded-full text-sm font-medium transition-all shadow-xl hover:-translate-y-0.5 cursor-grab active:cursor-grabbing
                ${category.isMinimized
                  ? 'bg-slate-900/90 border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'bg-blue-900/40 border-blue-500/50 text-blue-100 hover:bg-blue-800/60 shadow-blue-900/20'}
                ${draggedDockId === category.id ? 'opacity-20 translate-y-2' : ''}`}
              title={category.isMinimized ? "Restore Backlog" : "Minimize Backlog"}
            >
              <ListTodo size={16} className={category.isMinimized ? 'opacity-50' : 'text-blue-400'} />
              <span className="max-w-[150px] truncate">{category.name}</span>
            </button>
          ))}
          {/* Recurring Tasks Dock Item */}
          <button
            onClick={() => toggleRecurringMinimized()}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-2 backdrop-blur-md border rounded-full text-sm font-medium transition-all shadow-xl hover:-translate-y-0.5
              ${isRecurringMinimized
                ? 'bg-slate-900/90 border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800'
                : 'bg-purple-900/40 border-purple-500/50 text-purple-100 hover:bg-purple-800/60 shadow-purple-900/20'}`}
            title={isRecurringMinimized ? "Restore Recurring Tasks" : "Minimize Recurring Tasks"}
          >
            <RotateCcw size={16} className={isRecurringMinimized ? 'opacity-50' : 'text-purple-400'} />
            <span>定期タスクデッキ</span>
          </button>

          {/* History Dock Item (Only show if there's history) */}
          {historyCount > 0 && (
            <button
              onClick={() => toggleHistoryMinimized()}
              className={`pointer-events-auto flex items-center gap-2 px-4 py-2 backdrop-blur-md border rounded-full text-sm font-medium transition-all shadow-xl hover:-translate-y-0.5
                ${isHistoryMinimized
                  ? 'bg-slate-900/90 border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'bg-green-900/40 border-green-500/50 text-green-100 hover:bg-green-800/60 shadow-green-900/20'}`}
              title={isHistoryMinimized ? "Restore Completed Tasks" : "Minimize Completed Tasks"}
            >
              <Plus size={16} className={`rotate-45 ${isHistoryMinimized ? 'opacity-50' : 'text-green-400'}`} />
              <span>完了タスクデッキ</span>
            </button>
          )}
        </div>
      </div>

      {/* Map through all active backlog categories and render a panel for each */}
      {backlogCategories.filter(c => !c.isMinimized).map((category, index) => (
        <BacklogPanel
          key={category.id}
          category={category}
          // Stagger default positions so they don't perfectly overlap
          defaultPosition={{ bottom: 32, right: 32 + (index * 350) }}
        />
      ))}

      <TaskTableView isOpen={isTaskTableOpen} onClose={() => setIsTaskTableOpen(false)} />
      {!isRecurringMinimized && <RecurringTasks />}
      {!isHistoryMinimized && <HistoryView />}

      <TaskLogModal isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />
      <ColorSettingsModal isOpen={isColorSettingsOpen} onClose={() => setIsColorSettingsOpen(false)} />

    </main>
  );
}
