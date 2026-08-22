"use client";

import { useTaskStore } from '@/store/useTaskStore';
import { useMemoStore } from '@/store/useMemoStore';
import { UI_LAYER } from '@/utils/layers';
import { X, Check, Save, Upload, Download, Settings, Palette, Clock, RotateCcw } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNotification } from '@/hooks/useNotification';
import { Bell, BellOff, Info } from 'lucide-react';
import { validateImportData } from '@/utils/validate';
import {
    getLegacyRecoveryCandidate,
    getPersistedValue,
    type LegacyRecoveryCandidate,
} from '@/store/indexedDbStorage';

export function SettingsDialog() {
    const {
        activeDialog,
        openDialog,
        dayStartHour,
        setDayStartHour,
        missedTaskWindowMinutes,
        setMissedTaskWindowMinutes,
        colors,
        updateColorName,
        importState,
        mergeRecoveredState,
    } = useTaskStore();
    const isSettingsOpen = activeDialog === 'settings';

    const importMemoState = useMemoStore((state) => state.importState);
    const mergeRecoveredMemos = useMemoStore((state) => state.mergeRecoveredState);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [editingColorId, setEditingColorId] = useState<string | null>(null);
    const [editColorValue, setEditColorValue] = useState('');
    const [legacyRecovery, setLegacyRecovery] = useState<LegacyRecoveryCandidate | null>(null);
    const [legacyInspectionComplete, setLegacyInspectionComplete] = useState(false);
    const [hasRecoveredLegacy, setHasRecoveredLegacy] = useState(false);
    const { permission, requestPermission, sendNotification } = useNotification();

    useEffect(() => {
        let active = true;
        void getLegacyRecoveryCandidate().then((candidate) => {
            if (!active) return;
            setLegacyRecovery(candidate);
            setLegacyInspectionComplete(true);
        });
        return () => {
            active = false;
        };
    }, []);

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

    const handleExport = async () => {
        const rawTaskData = await getPersistedValue('timetask-storage');
        const rawMemoData = await getPersistedValue('timetask-memos');

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

    const downloadLegacyRecovery = () => {
        if (!legacyRecovery) return;
        const backup = {
            tasks: { state: legacyRecovery.taskState, version: 1 },
            memos: { state: legacyRecovery.memoState, version: 1 },
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `timetask-recovery-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const recoverLegacyData = () => {
        if (!legacyRecovery) return;
        const summary = legacyRecovery.summary;
        const confirmed = window.confirm(
            `旧保存データを現在のデータへ統合します。\n\n` +
            `バックログ: ${summary.backlogTasks}件\n` +
            `バックログデッキ: ${summary.backlogCategories}件\n` +
            `完了タスク: ${summary.history}件\n` +
            `定期タスク: ${summary.recurringTasks}件\n` +
            `作業ログ: ${summary.taskLogs}件\n` +
            `メモ: ${summary.memos}件\n\n` +
            `同じIDのデータは現在の内容を残します。`,
        );
        if (!confirmed) return;

        mergeRecoveredState(legacyRecovery.taskState);
        mergeRecoveredMemos(legacyRecovery.memoState);
        setHasRecoveredLegacy(true);
        alert('旧保存データを統合しました。内容を確認してから画面を再読み込みしてください。');
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300" style={{ zIndex: UI_LAYER.settings }}>
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
                        onClick={() => openDialog(null)}
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
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group hover:border-slate-600 transition-colors">
                            <div>
                                <p className="text-sm font-semibold text-slate-200">Missed Task Window</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">Minutes to look back for missed scheduled tasks on app start or tab focus</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={missedTaskWindowMinutes}
                                    onChange={(e) => setMissedTaskWindowMinutes(Math.max(0, Math.min(60, parseInt(e.target.value) || 0)))}
                                    className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-center text-white focus:outline-none focus:border-blue-500 transition-all"
                                />
                                <span className="text-[10px] font-bold text-slate-500">min</span>
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

                        {legacyRecovery && (
                            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
                                <div className="flex items-start gap-2">
                                    <RotateCcw size={15} className="text-amber-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-amber-200">旧LocalStorageデータを検出しました</p>
                                        <p className="text-[10px] leading-relaxed text-amber-100/70 mt-1">
                                            現在のデータを優先し、欠けているタスク、デッキ、履歴、ログ、メモをID単位で統合できます。
                                        </p>
                                        <p className="text-[9px] text-amber-100/50 mt-1">
                                            検出元: {legacyRecovery.sources.join('、')}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-300">
                                    <span>バックログ: {legacyRecovery.summary.backlogTasks}</span>
                                    <span>デッキ: {legacyRecovery.summary.backlogCategories}</span>
                                    <span>完了タスク: {legacyRecovery.summary.history}</span>
                                    <span>定期タスク: {legacyRecovery.summary.recurringTasks}</span>
                                    <span>作業ログ: {legacyRecovery.summary.taskLogs}</span>
                                    <span>メモ: {legacyRecovery.summary.memos}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={downloadLegacyRecovery}
                                        className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-[10px] font-bold text-slate-200 hover:bg-slate-700"
                                    >
                                        <Download size={12} />
                                        復旧元を保存
                                    </button>
                                    <button
                                        onClick={recoverLegacyData}
                                        className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-400/60 bg-amber-500/20 px-2 py-2 text-[10px] font-bold text-amber-100 hover:bg-amber-500/30"
                                    >
                                        <RotateCcw size={12} />
                                        {hasRecoveredLegacy ? 'もう一度統合' : 'データを復旧'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {!legacyInspectionComplete && (
                            <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 text-[10px] text-slate-400">
                                LocalStorageと旧IndexedDBから復旧可能なデータを検索しています…
                            </div>
                        )}

                        {legacyInspectionComplete && !legacyRecovery && (
                            <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 space-y-1">
                                <p className="text-[10px] font-bold text-slate-300">復旧可能な旧データは検出されませんでした</p>
                                <p className="text-[9px] leading-relaxed text-slate-500">
                                    LocalStorageの画面配置だけが残っている場合や、タスクデータが既に削除されている場合は復旧欄を表示できません。
                                </p>
                            </div>
                        )}
                    </section>
                </div>

                <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex justify-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">TimeTask v{process.env.NEXT_PUBLIC_APP_VERSION} Settings</p>
                </div>
            </div>
        </div>
    );
}
