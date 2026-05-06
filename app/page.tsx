"use client";

import { useState, useEffect, useMemo } from "react";
import { Startup, Tag } from "./types";
import TagBadge from "./components/TagBadge";
import AddStartupModal from "./components/AddStartupModal";
import StartupDetailModal from "./components/StartupDetailModal";
import ApiKeyModal, { API_KEY_STORAGE } from "./components/ApiKeyModal";

const ALL_TAGS: Tag[] = ["AI", "BCI", "Enterprise", "Media", "Mobility", "Sustainability", "Fintech", "Healthtech", "Climate", "Web3", "Robotics", "Space"];
const STORAGE_KEY = "ntt-docomo-startups";

export default function Home() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [detail, setDetail] = useState<Startup | null>(null);
  const [sortField, setSortField] = useState<keyof Startup>("addedDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setStartups(JSON.parse(stored));
    const key = localStorage.getItem(API_KEY_STORAGE) || "";
    setApiKey(key);
  }, []);

  function save(updated: Startup[]) {
    setStartups(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function handleAdd(s: Startup) {
    save([s, ...startups]);
    setShowAdd(false);
  }

  function handleDelete(id: string) {
    save(startups.filter((s) => s.id !== id));
  }

  function handleUpdate(updated: Startup) {
    save(startups.map((s) => s.id === updated.id ? updated : s));
    setDetail(updated);
  }

  function toggleTagFilter(t: Tag) {
    setSelectedTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  function handleSort(field: keyof Startup) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    let list = startups.filter((s) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        s.companyName.toLowerCase().includes(q) ||
        s.shortDescription.toLowerCase().includes(q) ||
        s.hq.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q));
      const matchesTags =
        selectedTags.length === 0 || selectedTags.every((t) => s.tags.includes(t));
      return matchesSearch && matchesTags;
    });

    list = [...list].sort((a, b) => {
      const av = String(a[sortField] ?? "");
      const bv = String(b[sortField] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    return list;
  }, [startups, search, selectedTags, sortField, sortDir]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">N</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Startup Sourcing</h1>
              <p className="text-xs text-gray-500">NTT Docomo</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <input
              type="text"
              placeholder="Search startups…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowApiKey(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap ${
              apiKey
                ? "border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
                : "border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${apiKey ? "bg-green-500" : "bg-orange-400"}`} />
            {apiKey ? "API Key Set" : "Set API Key"}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            + Add Startup
          </button>
        </div>

        {/* Tag filters */}
        <div className="max-w-7xl mx-auto px-6 pb-3 flex flex-wrap gap-2">
          {ALL_TAGS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTagFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTags.includes(t)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* Table */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {filtered.length} startup{filtered.length !== 1 ? "s" : ""}
            {selectedTags.length > 0 && ` · filtered by ${selectedTags.join(", ")}`}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-lg font-medium text-gray-500">No startups yet</p>
            <p className="text-sm mt-1">Click &quot;+ Add Startup&quot; to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {(
                    [
                      ["companyName", "Company"],
                      ["shortDescription", "Description"],
                      ["hq", "HQ"],
                      ["foundingYear", "Founded"],
                      ["employees", "Employees"],
                      ["addedDate", "Added"],
                    ] as [keyof Startup, string][]
                  ).map(([field, label]) => (
                    <Th key={field} label={label} field={field} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  ))}
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => setDetail(s)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{s.companyName}</span>
                      {s.websiteUrl && (
                        <a
                          href={s.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="ml-2 text-blue-500 hover:underline text-xs"
                        >
                          ↗
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[220px] truncate">{s.shortDescription}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.hq || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.foundingYear || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.employees || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{s.addedDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.tags.slice(0, 3).map((t) => <TagBadge key={t} tag={t} />)}
                        {s.tags.length > 3 && (
                          <span className="text-xs text-gray-400">+{s.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showAdd && <AddStartupModal onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {detail && <StartupDetailModal startup={detail} onClose={() => setDetail(null)} onDelete={handleDelete} onUpdate={handleUpdate} />}
      {showApiKey && (
        <ApiKeyModal
          current={apiKey}
          onSave={setApiKey}
          onClose={() => setShowApiKey(false)}
        />
      )}
    </div>
  );
}

function Th({
  label, field, sortField, sortDir, onSort,
}: {
  label: string;
  field: keyof Startup;
  sortField: keyof Startup;
  sortDir: "asc" | "desc";
  onSort: (f: keyof Startup) => void;
}) {
  const active = sortField === field;
  return (
    <th
      className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap select-none"
      onClick={() => onSort(field)}
    >
      {label}
      <span className="ml-1 text-gray-400">
        {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </th>
  );
}
