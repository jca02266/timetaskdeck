"use client";

import { useState, useRef, useEffect } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { Play } from 'lucide-react';

export function TaskInput() {
    const { startTask, history, backlogTasks } = useTaskStore();
    const [input, setInput] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleStart = () => {
        if (!input.trim()) return;
        startTask(input);
        setInput('');
        setShowSuggestions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === 'Enter') {
            handleStart();
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Autocomplete logic
    useEffect(() => {
        if (!input.trim()) {
            setSuggestions([]);
            return;
        }

        // Combine unique names from history and backlog
        const historyNames = history.map(t => t.name);
        const backlogNames = backlogTasks.map(t => t.name);
        const allNames = Array.from(new Set([...historyNames, ...backlogNames]));

        const matched = allNames
            .filter(name => name.toLowerCase().includes(input.toLowerCase()))
            .slice(0, 5); // Limit to top 5

        setSuggestions(matched);
        setShowSuggestions(matched.length > 0);
    }, [input, history, backlogTasks]);

    const selectSuggestion = (name: string) => {
        setInput(name);
        setShowSuggestions(false);
    };

    return (
        <div className="relative w-full z-20" ref={dropdownRef}>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="What are you working on?"
                    className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-6 py-4 text-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder-slate-500 glass"
                    autoFocus
                />
                <button
                    onClick={handleStart}
                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-8 flex items-center justify-center transition-colors shadow-lg shadow-blue-500/20"
                >
                    <Play fill="currentColor" />
                </button>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/90 border border-slate-700 rounded-xl overflow-hidden backdrop-blur-xl shadow-2xl z-50">
                    {suggestions.map((s, i) => (
                        <button
                            key={i}
                            className="w-full text-left px-6 py-3 hover:bg-blue-500/20 text-slate-300 hover:text-white transition-colors border-b border-slate-800 last:border-0"
                            onClick={() => selectSuggestion(s)}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
