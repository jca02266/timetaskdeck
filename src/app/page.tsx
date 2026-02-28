"use client";

import { TaskTimer } from "@/components/TaskTimer";
import { TaskInput } from "@/components/TaskInput";
import { TaskStack } from "@/components/TaskStack";
// import { BacklogList } from "@/components/BacklogList";
import { BacklogPanel } from "@/components/BacklogPanel";
import { RecurringTasks } from "@/components/RecurringTasks";
import { HistoryView } from "@/components/HistoryView";
import { TaskLogModal } from "@/components/TaskLogModal";
import { SettingsDialog } from "@/components/SettingsDialog";
import { TaskTableView } from "@/components/TaskTableView";
import { TaskMemoEditor } from "@/components/TaskMemoEditor";
import { useState } from "react";
/* New Components */
import { DraggablePanel } from "@/components/DraggablePanel";
import { StorageOperations } from "@/components/StorageOperations";
import { useTaskStore } from "@/store/useTaskStore";

/* Icons */
import { RotateCcw, Plus, Play, List, Layers, Settings, ListPlus, Table, ListTodo, Repeat, Clock, FileText } from 'lucide-react';

export default function Home() {
  const [isStackExpanded, setStackExpanded] = useState(false);
  const [draggedDockId, setDraggedDockId] = useState<string | null>(null);

  const {
    isLogOpen,
    isSettingsOpen,
    isTaskTableOpen,
    setIsLogOpen,
    setIsSettingsOpen,
    setIsTaskTableOpen,
    backlogCategories,
    addBacklogCategory,
    isRecurringMinimized,
    isHistoryMinimized,
    toggleRecurringMinimized,
    toggleHistoryMinimized,
    activeMemoTaskId,
    isMemoMinimized,
    history,
    currentTask,
    taskStack
  } = useTaskStore();

  const deckTaskCount = (currentTask ? 1 : 0) + taskStack.length;

  // Responsive default sizes
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const controlPanelWidth = isMobile ? Math.min(window.innerWidth - 32, 440) : 440;
  const timerPanelWidth = isMobile ? Math.min(window.innerWidth - 32, 500) : 500;

  const historyCount = history.length;

  return (
    <main className="min-h-screen relative p-8 pb-32 overflow-hidden flex flex-col bg-slate-950 text-slate-200 selection:bg-blue-500/30">
      {/* Brand */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 opacity-60 z-10 pointer-events-none select-none flex justify-center">
        <img src="/logo.png" alt="TimeTaskDeck Logo" style={{ width: '220%', height: 'auto' }} className="max-w-none object-contain" />
      </div>

      {/* Control Panel (Input + List Button) */}
      <DraggablePanel
        id="control-panel"
        defaultPosition={{ top: 32, left: isMobile ? 16 : 32 }}
        defaultSize={{ width: controlPanelWidth, height: 180 }}
        minSize={{ width: Math.min(320, controlPanelWidth), height: 180 }}
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
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 hover:bg-slate-700/50 rounded text-xs text-slate-400 hover:text-white transition-colors border border-slate-700"
              >
                <Settings size={14} />
                <span>Settings</span>
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
        defaultPosition={{ top: 120, left: isMobile ? 16 : 300 }} // Safe default, center logic handled on client if needed
        defaultSize={{ width: timerPanelWidth, height: 500 }}
        title={`カレントタスクデッキ (${deckTaskCount})`}
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
      <div className="fixed bottom-6 left-0 right-0 flex justify-center gap-3 z-[200] pointer-events-none px-4">
        <div className="flex flex-wrap justify-center gap-2 max-w-4xl">
          {backlogCategories.map((category, index) => (
            <button
              key={category.id}
              data-category-id={category.id}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                const startTime = Date.now();
                const startPos = { x: e.clientX, y: e.clientY };
                let hasMoved = false;

                const target = e.currentTarget as HTMLElement;
                target.setPointerCapture(e.pointerId);

                const onPointerMove = (moveEvent: PointerEvent) => {
                  const dist = Math.sqrt(
                    Math.pow(moveEvent.clientX - startPos.x, 2) +
                    Math.pow(moveEvent.clientY - startPos.y, 2)
                  );

                  if (dist > 10 && !hasMoved) {
                    hasMoved = true;
                    setDraggedDockId(category.id);
                  }

                  if (hasMoved) {
                    const overElement = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
                    const overButton = overElement?.closest('button[data-category-id]');
                    if (overButton) {
                      const overId = overButton.getAttribute('data-category-id');
                      if (overId && overId !== category.id) {
                        const fromIdx = backlogCategories.findIndex(c => c.id === category.id);
                        const toIdx = backlogCategories.findIndex(c => c.id === overId);
                        if (fromIdx !== -1 && toIdx !== -1) {
                          useTaskStore.getState().reorderBacklogCategories(fromIdx, toIdx);
                        }
                      }
                    }
                  }
                };

                const onPointerUp = (upEvent: PointerEvent) => {
                  target.releasePointerCapture(upEvent.pointerId);
                  window.removeEventListener('pointermove', onPointerMove);
                  window.removeEventListener('pointerup', onPointerUp);

                  if (!hasMoved && (Date.now() - startTime < 300)) {
                    // It was a tap
                    useTaskStore.getState().toggleBacklogMinimized(category.id);
                    if (category.isMinimized) {
                      useTaskStore.getState().bringToFront(`backlog-panel-${category.id}`);
                    }
                  }
                  setDraggedDockId(null);
                };

                window.addEventListener('pointermove', onPointerMove);
                window.addEventListener('pointerup', onPointerUp);
              }}
              className={`pointer-events-auto flex items-center gap-2 px-4 py-2 backdrop-blur-md border rounded-full text-sm font-medium transition-all shadow-xl hover:-translate-y-0.5 cursor-grab active:cursor-grabbing select-none
                ${category.isMinimized
                  ? 'bg-slate-900/90 border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'bg-blue-900/40 border-blue-500/50 text-blue-100 hover:bg-blue-800/60 shadow-blue-900/20'}
                ${draggedDockId === category.id ? 'opacity-20 scale-95' : ''}`}
              style={{ touchAction: 'none' }}
              title={category.isMinimized ? "Restore Backlog" : "Minimize Backlog"}
            >
              <ListTodo size={16} className={category.isMinimized ? 'opacity-50' : 'text-blue-400'} />
              <span className="max-w-[150px] truncate">{category.name}</span>
            </button>
          ))}
          {/* Recurring Tasks Dock Item */}
          <button
            onClick={() => {
              toggleRecurringMinimized();
              if (isRecurringMinimized) {
                useTaskStore.getState().bringToFront('recurring-panel');
              }
            }}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-2 backdrop-blur-md border rounded-full text-sm font-medium transition-all shadow-xl hover:-translate-y-0.5
              ${isRecurringMinimized
                ? 'bg-slate-900/90 border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800'
                : 'bg-purple-900/40 border-purple-500/50 text-purple-100 hover:bg-purple-800/60 shadow-purple-900/20'}`}
            title={isRecurringMinimized ? "Restore Recurring Tasks" : "Minimize Recurring Tasks"}
          >
            <Repeat size={16} className={isRecurringMinimized ? 'opacity-50' : 'text-purple-400'} />
            <span>定期タスクデッキ</span>
          </button>

          {/* Memo Dock Item (Only show if memo is active and minimized) */}
          {activeMemoTaskId && isMemoMinimized && (
            <button
              onClick={() => {
                useTaskStore.getState().toggleMemoMinimized();
                useTaskStore.getState().bringToFront('memo-panel');
              }}
              className="pointer-events-auto flex items-center gap-2 px-4 py-2 backdrop-blur-md border rounded-full text-sm font-medium transition-all shadow-xl hover:-translate-y-0.5 bg-slate-900/90 border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800"
              title="Restore Memo"
            >
              <FileText size={16} className="opacity-50" />
              <span className="max-w-[150px] truncate">
                {useTaskStore.getState().getTaskById(activeMemoTaskId)?.name || "Task"} - メモ
              </span>
            </button>
          )}

          {/* History Dock Item (Only show if there's history) */}
          {historyCount > 0 && (
            <button
              onClick={() => {
                toggleHistoryMinimized();
                if (isHistoryMinimized) {
                  useTaskStore.getState().bringToFront('history-panel');
                }
              }}
              className={`pointer-events-auto flex items-center gap-2 px-4 py-2 backdrop-blur-md border rounded-full text-sm font-medium transition-all shadow-xl hover:-translate-y-0.5
                ${isHistoryMinimized
                  ? 'bg-slate-900/90 border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'bg-green-900/40 border-green-500/50 text-green-100 hover:bg-green-800/60 shadow-green-900/20'}`}
              title={isHistoryMinimized ? "Restore Completed Tasks" : "Minimize Completed Tasks"}
            >
              <Clock size={16} className={isHistoryMinimized ? 'opacity-50' : 'text-green-400'} />
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

      <TaskTableView />
      {!isRecurringMinimized && <RecurringTasks />}
      {!isHistoryMinimized && <HistoryView />}
      <TaskMemoEditor />

      <TaskLogModal />
      <SettingsDialog />

    </main>
  );
}
