"use client";

import { useState, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { Startup, Project, Tag } from "./types";
import TagBadge from "./components/TagBadge";
import AddStartupModal from "./components/AddStartupModal";
import StartupDetailModal from "./components/StartupDetailModal";
import ApiKeyModal, { API_KEY_STORAGE } from "./components/ApiKeyModal";

const ALL_TAGS: Tag[] = ["AI", "BCI", "Enterprise", "Media", "Mobility", "Sustainability", "Fintech", "Healthtech", "Climate", "Web3", "Robotics", "Space"];
const STORAGE_KEY = "ntt-docomo-startups";
const PROJECTS_KEY = "ntt-docomo-projects";

type ActiveView = "all" | "unassigned" | string; // string = project id

export default function Home() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>("all");
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [detail, setDetail] = useState<Startup | null>(null);
  const [sortField, setSortField] = useState<keyof Startup>("addedDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setStartups(JSON.parse(stored));
    const storedProjects = localStorage.getItem(PROJECTS_KEY);
    if (storedProjects) setProjects(JSON.parse(storedProjects));
    const key = localStorage.getItem(API_KEY_STORAGE) || "";
    setApiKey(key);
  }, []);

  function saveStartups(updated: Startup[]) {
    setStartups(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function saveProjects(updated: Project[]) {
    setProjects(updated);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
  }

  function handleAdd(s: Startup) {
    saveStartups([s, ...startups]);
    setShowAdd(false);
  }

  function handleDelete(id: string) {
    saveStartups(startups.filter((s) => s.id !== id));
  }

  function handleUpdate(updated: Startup) {
    saveStartups(startups.map((s) => s.id === updated.id ? updated : s));
    setDetail(updated);
  }

  function handleSort(field: keyof Startup) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }

  function toggleTagFilter(t: Tag) {
    setSelectedTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  function addProject() {
    const name = newProjectName.trim();
    if (!name) return;
    const project: Project = { id: uuidv4(), name, createdDate: new Date().toISOString().split("T")[0] };
    saveProjects([...projects, project]);
    setNewProjectName("");
    setAddingProject(false);
    setActiveView(project.id);
  }

  function deleteProject(id: string) {
    saveStartups(startups.map((s) => s.projectId === id ? { ...s, projectId: "" } : s));
    saveProjects(projects.filter((p) => p.id !== id));
    if (activeView === id) setActiveView("all");
  }

  const unassignedCount = useMemo(() => startups.filter((s) => !s.projectId).length, [startups]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = startups.filter((s) => {
      const matchesSearch =
        !q ||
        s.companyName.toLowerCase().includes(q) ||
        s.shortDescription.toLowerCase().includes(q) ||
        s.hq.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q));
      const matchesTags =
        selectedTags.length === 0 || selectedTags.every((t) => s.tags.includes(t));
      // Search spans all projects; project filter only applies when not searching
      const matchesProject =
        q ||
        activeView === "all" ||
        (activeView === "unassigned" ? !s.projectId : s.projectId === activeView);
      return matchesSearch && matchesTags && matchesProject;
    });

    return [...list].sort((a, b) => {
      const av = String(a[sortField] ?? "");
      const bv = String(b[sortField] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [startups, search, selectedTags, sortField, sortDir, activeView]);

  const activeProjectName =
    activeView === "all" ? "All Startups" :
    activeView === "unassigned" ? "Unassigned" :
    projects.find((p) => p.id === activeView)?.name ?? "All Startups";

  const defaultProjectId =
    activeView === "all" || activeView === "unassigned" ? "" : activeView;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-red-600 rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">N</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Startup Sourcing</p>
              <p className="text-xs text-gray-400">NTT Docomo</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <button
            onClick={() => setActiveView("all")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === "all" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <span>All Startups</span>
            <span className="text-xs text-gray-400">{startups.length}</span>
          </button>

          <div className="pt-3">
            <p className="px-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Projects</p>
            {projects.map((p) => (
              <div key={p.id} className="group relative">
                <button
                  onClick={() => setActiveView(p.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors pr-7 ${
                    activeView === p.id ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span className="truncate text-left">{p.name}</span>
                  <span className="text-xs text-gray-400 shrink-0 ml-1">
                    {startups.filter((s) => s.projectId === p.id).length}
                  </span>
                </button>
                <button
                  onClick={() => deleteProject(p.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-base leading-none"
                  title="Delete project"
                >
                  ×
                </button>
              </div>
            ))}

            {unassignedCount > 0 && (
              <button
                onClick={() => setActiveView("unassigned")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeView === "unassigned" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-400 hover:bg-gray-100"
                }`}
              >
                <span className="italic">Unassigned</span>
                <span className="text-xs text-gray-400">{unassignedCount}</span>
              </button>
            )}

            {addingProject ? (
              <div className="px-1 pt-1">
                <input
                  autoFocus
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addProject();
                    if (e.key === "Escape") { setAddingProject(false); setNewProjectName(""); }
                  }}
                  onBlur={() => { if (!newProjectName.trim()) { setAddingProject(false); } }}
                  placeholder="Project name…"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <button
                onClick={() => setAddingProject(true)}
                className="w-full flex items-center gap-1 px-3 py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                + New Project
              </button>
            )}
          </div>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900 shrink-0">{activeProjectName}</h2>
            <div className="flex items-center gap-3 flex-1 max-w-lg">
              <input
                type="text"
                placeholder="Search all startups…"
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
          <div className="px-6 pb-3 flex flex-wrap gap-2">
            {ALL_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => toggleTagFilter(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedTags.includes(t) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 overflow-auto px-6 py-6">
          <p className="text-sm text-gray-500 mb-4">
            {filtered.length} startup{filtered.length !== 1 ? "s" : ""}
            {search && " across all projects"}
            {selectedTags.length > 0 && ` · filtered by ${selectedTags.join(", ")}`}
          </p>

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
                          {s.tags.length > 3 && <span className="text-xs text-gray-400">+{s.tags.length - 3}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {showAdd && (
        <AddStartupModal
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
          projects={projects}
          defaultProjectId={defaultProjectId}
        />
      )}
      {detail && (
        <StartupDetailModal
          startup={detail}
          onClose={() => setDetail(null)}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          projects={projects}
        />
      )}
      {showApiKey && (
        <ApiKeyModal current={apiKey} onSave={setApiKey} onClose={() => setShowApiKey(false)} />
      )}
    </div>
  );
}

function Th({ label, field, sortField, sortDir, onSort }: {
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
      <span className="ml-1 text-gray-400">{active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
    </th>
  );
}
