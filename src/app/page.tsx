"use client";

import { TaskTimer } from "@/components/TaskTimer";
import { TaskInput } from "@/components/TaskInput";
import { TaskStack } from "@/components/TaskStack";
import { BacklogList } from "@/components/BacklogList";
import { RecurringTasks } from "@/components/RecurringTasks";
import { HistoryView } from "@/components/HistoryView";
import { TaskLogModal } from "@/components/TaskLogModal";
import { useState } from "react";
/* New Components */
import { DraggablePanel } from "@/components/DraggablePanel";

/* Icons */
import { RotateCcw, Plus, Play, List, Layers } from 'lucide-react';

export default function Home() {
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isStackExpanded, setStackExpanded] = useState(false);

  return (
    <main className="min-h-screen relative p-8 pb-32 overflow-hidden flex flex-col bg-slate-950 text-slate-200 selection:bg-blue-500/30">
      {/* Brand */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 opacity-50 font-bold tracking-widest text-sm z-10 text-slate-500 pointer-events-none">
        TIMETASK
      </div>

      {/* Control Panel (Input + List Button) */}
      <DraggablePanel
        id="control-panel"
        defaultPosition={{ top: 32, left: 32 }}
        defaultSize={{ width: 400, height: 140 }}
        title="New Task"
      >
        <div className="p-4 flex flex-col gap-4 h-full justify-center">
          <TaskInput />
          <div className="flex justify-end">
            <button
              onClick={() => setIsLogOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded text-xs text-slate-400 hover:text-white transition-colors border border-slate-700 hover:border-slate-500"
            >
              <List size={14} />
              <span>一覧表示</span>
            </button>
          </div>
        </div>
      </DraggablePanel>

      {/* Timer Panel (Timer + Stack) */}
      <DraggablePanel
        id="timer-panel"
        defaultPosition={{ top: 120, left: 300 }} // Safe default, center logic handled on client if needed
        defaultSize={{ width: 500, height: 500 }}
        title="Current Task"
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

      <BacklogList />
      <RecurringTasks />
      <HistoryView />

      <TaskLogModal isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />

    </main>
  );
}
