"use client";

import { TaskTimer } from "@/components/TaskTimer";
import { TaskInput } from "@/components/TaskInput";
import { TaskStack } from "@/components/TaskStack";
// import { BacklogList } from "@/components/BacklogList";
import { BacklogPanel } from "@/components/BacklogPanel";
import { RecurringTasks } from "@/components/RecurringTasks";
import { HistoryView } from "@/components/HistoryView";
import { TaskLogModal } from "@/components/TaskLogModal";
import { BacklogTableView } from "@/components/BacklogTableView";
import { ColorSettingsModal } from "@/components/ColorSettingsModal";
import { useState } from "react";
/* New Components */
import { DraggablePanel } from "@/components/DraggablePanel";
import { useTaskStore } from "@/store/useTaskStore";

/* Icons */
import { RotateCcw, Plus, Play, List, Layers, Settings, ListPlus, Table } from 'lucide-react';

export default function Home() {
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isStackExpanded, setStackExpanded] = useState(false);
  const [isColorSettingsOpen, setIsColorSettingsOpen] = useState(false);
  const [isBacklogTableOpen, setIsBacklogTableOpen] = useState(false);

  const backlogCategories = useTaskStore((state) => state.backlogCategories);
  const addBacklogCategory = useTaskStore((state) => state.addBacklogCategory);

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
                onClick={() => setIsBacklogTableOpen(true)}
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

      {/* Map through all backlog categories and render a panel for each */}
      {backlogCategories.map((category, index) => (
        <BacklogPanel
          key={category.id}
          category={category}
          // Stagger default positions so they don't perfectly overlap
          defaultPosition={{ bottom: 32, right: 32 + (index * 350) }}
        />
      ))}

      <BacklogTableView isOpen={isBacklogTableOpen} onClose={() => setIsBacklogTableOpen(false)} />
      <RecurringTasks />
      <HistoryView />

      <TaskLogModal isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />
      <ColorSettingsModal isOpen={isColorSettingsOpen} onClose={() => setIsColorSettingsOpen(false)} />

    </main>
  );
}
