"use client";

import { TaskTimer } from "@/components/TaskTimer";
import { TaskInput } from "@/components/TaskInput";
import { TaskStack } from "@/components/TaskStack";
import { BacklogList } from "@/components/BacklogList";
import { RecurringTasks } from "@/components/RecurringTasks";
import { HistoryView } from "@/components/HistoryView";
import { TaskLogModal } from "@/components/TaskLogModal";
import { useState } from "react";
import { List } from "lucide-react";

export default function Home() {
  const [isLogOpen, setIsLogOpen] = useState(false);

  return (
    <main className="min-h-screen relative p-8 pb-32 overflow-hidden flex flex-col">
      {/* Brand */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 opacity-50 font-bold tracking-widest text-sm z-10 text-slate-500">
        TIMETASK
      </div>

      {/* Task Input - Top Left */}
      <div className="absolute top-8 left-8 w-80 z-20">
        <TaskInput />
      </div>

      {/* List View Button - Moved to left of recurring tasks */}
      <div className="absolute top-8 right-96 z-20">
        <button
          onClick={() => setIsLogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur-md rounded-lg border border-slate-700 hover:border-slate-500 transition-all text-slate-300 hover:text-white"
        >
          <List size={18} />
          <span className="text-sm font-medium">一覧表示</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center gap-12 z-10 relative">
        <div className="relative w-full max-w-lg z-10">
          <TaskStack />
          <TaskTimer />
        </div>
      </div>

      <BacklogList />
      <RecurringTasks />
      <HistoryView />

      <TaskLogModal isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />

    </main>
  );
}
