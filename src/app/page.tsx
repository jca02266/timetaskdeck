import { TaskTimer } from "@/components/TaskTimer";
import { TaskInput } from "@/components/TaskInput";
import { TaskStack } from "@/components/TaskStack";
import { BacklogList } from "@/components/BacklogList";
import { HistoryView } from "@/components/HistoryView";

export default function Home() {
  return (
    <main className="min-h-screen relative p-8 pb-32 overflow-hidden flex flex-col">
      {/* Brand */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 opacity-50 font-bold tracking-widest text-sm z-10 text-slate-500">
        TIMETASK
      </div>

      <div className="flex-1 flex flex-col justify-center items-center gap-12 z-10 relative">
        <div className="w-full max-w-lg -mt-32">
          <TaskInput />
        </div>
        <div className="relative w-full max-w-lg z-10">
          <TaskStack />
          <TaskTimer />
        </div>
      </div>


      <BacklogList />

      <HistoryView />

    </main>
  );
}
