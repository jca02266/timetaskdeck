"use client";

import { useTaskStore } from "@/store/useTaskStore";
import { useMemoStore } from "@/store/useMemoStore";
import { DraggablePanel } from "./DraggablePanel";
import { FileText, Maximize2, Minimize2, Edit2, Eye, Copy, Check } from "lucide-react";
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
    const currentTask = useTaskStore((state) => state.currentTask);
    const getMemo = useMemoStore((state) => state.getMemo);
    const setMemo = useMemoStore((state) => state.setMemo);

    const [isMaximized, setIsMaximized] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Auto-save typing state
    const [localText, setLocalText] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync content when currentTask changes
    useEffect(() => {
        if (currentTask) {
            setLocalText(getMemo(currentTask.id));
            // Default to view mode if there is text, edit mode if empty
            setIsEditing(!getMemo(currentTask.id));
        } else {
            setLocalText("");
        }
    }, [currentTask?.id, getMemo]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setLocalText(newText);
        if (currentTask) {
            setMemo(currentTask.id, newText);
        }
    };

    if (!currentTask) return null;

    const defaultSize = { width: 300, height: 250 };
    const maxZSize = { width: Math.min(600, window.innerWidth - 40), height: Math.min(500, window.innerHeight - 40) };
    const minZSize = { width: 250, height: 40 }; // Just header

    const toggleMaximize = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMaximized(!isMaximized);
        if (isMinimized) setIsMinimized(false);
    };

    const toggleMinimize = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMinimized(!isMinimized);
        if (isMaximized) setIsMaximized(false);
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
                className={`p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors ${isMinimized ? 'bg-slate-700 text-white' : ''}`}
                title={isMinimized ? "元に戻す" : "最小化"}
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
        </div>
    );

    const titleNode = (
        <div className="flex items-center gap-2 max-w-[150px] sm:max-w-[200px]">
            <FileText size={14} className="text-blue-400 shrink-0" />
            <span className="truncate">{currentTask.name} - メモ</span>
        </div>
    );

    return (
        <DraggablePanel
            id={`memo-${currentTask.id}`} // Force re-render/re-position? Actually better to just use "task-memo" so it stays put when switching tasks
            defaultPosition={{ right: 20, top: 400 }}
            defaultSize={isMaximized ? maxZSize : isMinimized ? minZSize : defaultSize}
            minSize={{ width: 200, height: 40 }}
            title={titleNode}
            headerControls={renderHeaderControls()}
            resizable={!isMinimized && !isMaximized}
            className={`transition-all duration-200 ${isMaximized ? "border-blue-500/50 shadow-blue-500/20" : ""}`}
        >
            {!isMinimized && (
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
            )}
        </DraggablePanel>
    );
}
