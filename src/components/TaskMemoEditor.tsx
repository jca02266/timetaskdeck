"use client";

import { useTaskStore } from "@/store/useTaskStore";
import { useMemoStore } from "@/store/useMemoStore";
import { DraggablePanel } from "./DraggablePanel";
import { FileText, Maximize2, Minimize2, Edit2, Eye, Copy, Check, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

// Helper to detect and render URLs and Windows paths
const renderTextWithLinks = (text: string) => {
    // Basic URL regex
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    // Basic Windows path regex (e.g., C:\foo\bar or D:\baz)
    const winPathRegex = /([a-zA-Z]:\\[^\s"']+)/g;

    const lines = text.split('\n');

    return lines.map((line, lineIndex) => {
        if (!line.trim()) return <br key={lineIndex} />;

        // To safely parse multiple matches without overlapping, we can do a simple pass:
        // First split by URLs
        const parts = line.split(urlRegex);

        return (
            <div key={lineIndex} className="min-h-5 whitespace-pre-wrap word-break break-words">
                {parts.map((part, partIndex) => {
                    if (part.match(urlRegex)) {
                        return (
                            <a
                                key={partIndex}
                                href={part}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {part}
                            </a>
                        );
                    }

                    // For non-URL parts, check for Windows paths
                    const pathParts = part.split(winPathRegex);
                    return pathParts.map((subPart, subIndex) => {
                        if (subPart.match(winPathRegex)) {
                            return <WindowsPathCopy key={`${partIndex}-${subIndex}`} path={subPart} />;
                        }
                        return <span key={`${partIndex}-${subIndex}`}>{subPart}</span>;
                    });
                })}
            </div>
        );
    });
};

function WindowsPathCopy({ path }: { path: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(path);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <span
            onClick={handleCopy}
            className="inline-flex items-center gap-1 cursor-pointer text-orange-400 hover:text-orange-300 bg-orange-400/10 hover:bg-orange-400/20 px-1 rounded transition-colors group"
            title="クリックしてパスをコピー"
        >
            <span className="font-mono text-[0.9em]">{path}</span>
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
        </span>
    );
}

export function TaskMemoEditor() {
    const activeMemoTaskId = useTaskStore((state) => state.activeMemoTaskId);
    const isMemoMinimized = useTaskStore((state) => state.isMemoMinimized);
    const toggleMemoMinimized = useTaskStore((state) => state.toggleMemoMinimized);
    const closeMemo = useTaskStore((state) => state.closeMemo);
    const getTaskById = useTaskStore((state) => state.getTaskById);

    const setMemo = useMemoStore((state) => state.setMemo);
    const memos = useMemoStore((state) => state.memos);

    const [isMaximized, setIsMaximized] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Auto-save typing state
    const [localText, setLocalText] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync content when activeMemoTaskId or memos change
    useEffect(() => {
        if (activeMemoTaskId) {
            const currentMemo = memos[activeMemoTaskId] || "";
            setLocalText(currentMemo);
            // Default to editing if it's empty, otherwise viewing
            setIsEditing(!currentMemo);
        } else {
            setLocalText("");
            setIsMaximized(false);
            setIsEditing(false);
        }
    }, [activeMemoTaskId, memos]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setLocalText(newText);
        if (activeMemoTaskId) {
            setMemo(activeMemoTaskId, newText);
        }
    };

    if (!activeMemoTaskId || isMemoMinimized) return null;

    const task = getTaskById(activeMemoTaskId);
    const taskName = task ? task.name : "不明なタスク";

    const defaultSize = { width: 400, height: 350 };
    // We don't change size state for maximize anymore; we use CSS to override position/size.

    const toggleMaximize = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMaximized(!isMaximized);
    };

    const toggleMinimize = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleMemoMinimized(); // This will dock it and unmount this component
    };

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        closeMemo();
    };

    const toggleEditMode = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(!isEditing);
        if (!isEditing) {
            setTimeout(() => textareaRef.current?.focus(), 50);
        }
    };

    const renderHeaderControls = () => (
        <div className="flex bg-slate-800/80 rounded border border-slate-700 p-0.5">
            <button
                onClick={toggleMinimize}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title="デッキにおさめる (最小化)"
            >
                <Minimize2 size={12} />
            </button>
            <button
                onClick={toggleMaximize}
                className={`p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors ${isMaximized ? 'bg-slate-700 text-white' : ''}`}
                title={isMaximized ? "元に戻す" : "最大化"}
            >
                <Maximize2 size={12} />
            </button>
            <button
                onClick={handleClose}
                className="p-1 ml-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                title="閉じる"
            >
                <X size={12} />
            </button>
        </div>
    );

    const titleNode = (
        <div className="flex items-center gap-2 max-w-[150px] sm:max-w-[300px]" title={taskName}>
            <FileText size={14} className="text-blue-400 shrink-0" />
            <span className="truncate">{taskName} - メモ</span>
        </div>
    );

    // If maximized, we override the draggable panel completely using classes
    const maximizedClass = isMaximized ? "!fixed !inset-x-0 !inset-y-0 !w-full !h-full !max-w-none !max-h-none !z-[300] !rounded-none" : "";

    return (
        <DraggablePanel
            id="memo-panel" // Constant ID so its position is remembered globally for memos
            defaultPosition={{ right: 20, top: 200 }}
            defaultSize={defaultSize}
            minSize={{ width: 300, height: 200 }}
            title={titleNode}
            headerControls={renderHeaderControls()}
            resizable={!isMaximized}
            className={`transition-all duration-200 border-blue-500/30 shadow-blue-900/10 ${maximizedClass}`}
        >
            <div className="flex flex-col h-full bg-slate-900/95 relative overflow-hidden group">
                {/* View/Edit Toggle Floating Button */}
                <button
                    onPointerDown={toggleEditMode}
                    className="absolute right-3 top-3 z-10 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 opacity-50 group-hover:opacity-100 transition-all shadow-lg"
                    title={isEditing ? "プレビューモード" : "編集モード"}
                >
                    {isEditing ? <Eye size={14} /> : <Edit2 size={14} />}
                </button>

                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={localText}
                        onChange={handleTextChange}
                        onDoubleClick={toggleEditMode}
                        placeholder="Markdownテキスト、URL、Windowsパス(C:\...)を入力...&#10;ダブルクリックでプレビューに戻ります。"
                        className="flex-1 w-full bg-transparent p-4 text-sm text-slate-300 resize-none focus:outline-none scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent leading-relaxed"
                        spellCheck={false}
                    />
                ) : (
                    <div
                        className="flex-1 w-full p-4 overflow-y-auto text-sm text-slate-300 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent leading-relaxed"
                        onDoubleClick={toggleEditMode}
                        title="ダブルクリックで編集"
                    >
                        {localText ? renderTextWithLinks(localText) : (
                            <div className="text-slate-500 italic">
                                メモはありません。ダブルクリックで編集を開始します。
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DraggablePanel>
    );
}
