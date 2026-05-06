"use client";

import { useState } from "react";

export const API_KEY_STORAGE = "anthropic-api-key";

interface Props {
  current: string;
  onSave: (key: string) => void;
  onClose: () => void;
}

export default function ApiKeyModal({ current, onSave, onClose }: Props) {
  const [value, setValue] = useState(current);

  function handleSave() {
    const trimmed = value.trim();
    localStorage.setItem(API_KEY_STORAGE, trimmed);
    onSave(trimmed);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Anthropic API Key</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Your key is stored only in your browser&apos;s localStorage and sent directly to this app&apos;s research endpoint. It is never stored on any server.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="sk-ant-..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!value.trim()}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Save Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
