"use client";

import { useTaskStore } from '@/store/useTaskStore';
import { useMemoStore } from '@/store/useMemoStore';
import { X, Check, Save, Upload, Download, Settings, Palette, Clock } from 'lucide-react';
import { useState, useRef } from 'react';
import { useNotification } from '@/hooks/useNotification';
import { Bell, BellOff, Info } from 'lucide-react';
import { validateImportData } from '@/utils/validate';

export function SettingsDialog() {
    const {
        isSettingsOpen,
        setIsSettingsOpen,
        dayStartHour,
        setDayStartHour,
        colors,
        updateColorName,
        importState
    } = useTaskStore();

    const importMemoState = useMemoStore((state) => state.importState);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [editingColorId, setEditingColorId] = useState<string | null>(null);
    const [editColorValue, setEditColorValue] = useState('');
    const { permission, requestPermission, sendNotification } = useNotification();

    const handleRequestPermission = async () => {
        const result = await requestPermission();
        if (result === 'granted') {
            sendNotification('test-perm', 'Notification Enabled', 'Testing notifications from TimeTaskDeck!');
        } else {
            alert(`Notification permission: ${result}`);
        }
    };

    if (!isSettingsOpen) return null;

    const startEditingColor = (id: string, currentName: string) => {
        setEditingColorId(id);
        setEditColorValue(currentName);
    };

    const saveColorEdit = () => {
        if (editingColorId && editColorValue.trim()) {
            updateColorName(editingColorId, editColorValue.trim());
        }
        setEditingColorId(null);
        setEditColorValue('');
    };

    const cancelColorEdit = () => {
        setEditingColorId(null);
        setEditColorValue('');
    };

    const handleExport = () => {
        const rawTaskData = localStorage.getItem('timetask-storage');
        const rawMemoData = localStorage.getItem('timetask-memos');

        if (!rawTaskData) {
            alert("保存されたデータが見つかりません。");
            return;
        }

        try {
            const taskDataStr = JSON.parse(rawTaskData);
            const memoDataStr = rawMemoData ? JSON.parse(rawMemoData) : { state: { memos: {} } };

            const combinedData = {
                tasks: taskDataStr,
                memos: memoDataStr
            };

            const blob = new Blob([JSON.stringify(combinedData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            a.href = url;
            a.download = `timetask-backup-${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            alert("エクスポート中にエラーが発生しました。");
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                const validated = validateImportData(json);
                if (!validated) {
                    alert("インポートファイルの形式が正しくありません。");
                    return;
                }
                if (window.confirm("データをインポートしますか？現在の状態は上書きされます。")) {
                    if (validated.tasks || validated.memos) {
                        if (validated.tasks?.state) {
                            importState(validated.tasks.state);
                        }
                        if (validated.memos?.state) {
                            importMemoState(validated.memos.state);
                        }
                    } else {
                        importState(validated);
                    }
                    alert("インポートが完了しました。");
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            } catch (err) {
                alert("ファイルの読み込みに失敗しました。正しいJSON形式であることを確認してください。");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-800/30">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Settings className="text-blue-400" size={18} />
                        </div>
                        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-widest">Settings</h2>
                    </div>
                    <button
                        onClick={() => setIsSettingsOpen(false)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-slate-700">
                    {/* General Settings */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Clock size={14} />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Appearance & Logic</h3>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group hover:border-slate-600 transition-colors">
                            <div>
                                <p className="text-sm font-semibold text-slate-200">Day Start Hour</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">Tasks after this hour count as a new day</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    max="23"
                                    value={dayStartHour}
                                    onChange={(e) => setDayStartHour(parseInt(e.target.value) || 0)}
                                    className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-center text-white focus:outline-none focus:border-blue-500 transition-all"
                                />
                                <span className="text-[10px] font-bold text-slate-500">:00</span>
                            </div>
                        </div>
                    </section>

                    {/* Notification Settings */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Bell size={14} />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Notifications</h3>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-4 hover:border-slate-600 transition-colors">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                                        System Notifications
                                        {permission === 'granted' ? (
                                            <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full border border-green-500/30">Active</span>
                                        ) : (
                                            <span className="text-[9px] bg-red-500/20 text-red-100 px-1.5 py-0.5 rounded-full border border-red-500/30">Inactive</span>
                                        )}
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Permission is required for task alerts</p>
                                </div>
                                <button
                                    onClick={handleRequestPermission}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${permission === 'granted'
                                        ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                                        : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                                        }`}
                                >
                                    {permission === 'granted' ? <Bell size={12} /> : <BellOff size={12} />}
                                    <span>{permission === 'granted' ? 'Test Alert' : 'Enable'}</span>
                                </button>
                            </div>
                            {permission !== 'granted' && (
                                <div className="flex items-start gap-2 p-2 bg-blue-500/5 rounded-lg border border-blue-500/10">
                                    <Info size={12} className="text-blue-400 mt-0.5 shrink-0" />
                                    <p className="text-[10px] text-slate-400 leading-normal italic">
                                        If not working, please check your browser/system notification settings for this site.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Tag Settings */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Palette size={14} />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Tags & Categorization</h3>
                        </div>
                        <div className="grid gap-2">
                            {colors.map((color) => (
                                <div key={color.id} className="flex items-center gap-3 bg-slate-800/30 border border-slate-700/30 p-2 rounded-xl group hover:border-slate-600/50 transition-all">
                                    <div className={`w-3.5 h-3.5 rounded-full ${color.colorCode} shrink-0 shadow-lg`} />

                                    {editingColorId === color.id ? (
                                        <div className="flex items-center gap-1.5 flex-1">
                                            <input
                                                type="text"
                                                value={editColorValue}
                                                onChange={(e) => setEditColorValue(e.target.value)}
                                                className="flex-1 bg-slate-950 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveColorEdit();
                                                    if (e.key === 'Escape') cancelColorEdit();
                                                }}
                                                onBlur={saveColorEdit}
                                            />
                                            <button onClick={saveColorEdit} className="text-green-400 hover:bg-green-400/10 p-1 rounded">
                                                <Check size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            className="flex-1 text-xs text-slate-400 font-medium cursor-text hover:text-white transition-colors"
                                            onClick={() => startEditingColor(color.id, color.name)}
                                            title="Click to rename"
                                        >
                                            {color.name}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Data Management */}
                    <section className="space-y-4 pt-2">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Save size={14} />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Data Backup</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleExport}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700 hover:border-slate-500"
                            >
                                <Download size={14} />
                                <span>Export</span>
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700 hover:border-slate-500"
                            >
                                <Upload size={14} />
                                <span>Import</span>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImport}
                                accept=".json"
                                className="hidden"
                            />
                        </div>
                    </section>
                </div>

                <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex justify-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">TimeTask v2.0 Settings</p>
                </div>
            </div>
        </div>
    );
}
