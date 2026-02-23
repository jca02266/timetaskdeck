"use client";

import { useTaskStore } from "@/store/useTaskStore";
import { Download, Upload } from "lucide-react";
import { useRef } from "react";

export function StorageOperations() {
    const importState = useTaskStore((state) => state.importState);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        const rawData = localStorage.getItem('timetask-storage');
        if (!rawData) {
            alert("保存されたデータが見つかりません。");
            return;
        }

        const blob = new Blob([rawData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        a.href = url;
        a.download = `timetask-backup-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (window.confirm("データをインポートしますか？現在の状態は上書きされます。")) {
                    importState(json);
                    alert("インポートが完了しました。");
                    // Reset file input
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            } catch (err) {
                alert("ファイルの読み込みに失敗しました。正しいJSON形式であることを確認してください。");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex gap-2">
            <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/50 hover:bg-slate-700/50 rounded text-xs text-slate-400 hover:text-white transition-colors border border-slate-700"
                title="データをファイルに保存"
            >
                <Download size={14} />
                <span>Save JSON</span>
            </button>
            <div className="relative">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/50 hover:bg-slate-700/50 rounded text-xs text-slate-400 hover:text-white transition-colors border border-slate-700"
                    title="ファイルを読み込み"
                >
                    <Upload size={14} />
                    <span>Load JSON</span>
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImport}
                    accept=".json"
                    className="hidden"
                />
            </div>
        </div>
    );
}
