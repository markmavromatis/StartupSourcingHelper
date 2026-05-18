"use client";

import { useState, useEffect } from "react";
import { Startup, Project } from "../types";
import TagBadge from "./TagBadge";
import Image from "next/image";

interface Props {
  startup: Startup;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (s: Startup) => void;
  projects: Project[];
}

export default function StartupDetailModal({ startup, onClose, onDelete, onUpdate, projects }: Props) {
  const images = startup.imageUrls.filter(Boolean);
  const [editingVideo, setEditingVideo] = useState(false);
  const [videoInput, setVideoInput] = useState(startup.videoUrl || "");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function saveVideo() {
    onUpdate({ ...startup, videoUrl: videoInput });
    setEditingVideo(false);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(startup),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PowerPoint");
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${startup.companyName.replace(/\s+/g, "_")}_Profile.pptx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export PowerPoint");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{startup.companyName}</h2>
            <p className="text-sm text-gray-500 mt-0.5 italic">{startup.shortDescription}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4">×</button>
        </div>

        <div className="p-6 space-y-5">
          {startup.logoUrl && (
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={startup.logoUrl}
                  alt={`${startup.companyName} logo`}
                  width={96}
                  height={96}
                  className="object-contain w-full h-full"
                  unoptimized
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            </div>
          )}

          {images.length > 0 && (
            <div className="flex gap-3">
              {images.map((url, i) => (
                <div key={i} className="relative flex-1 aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={url}
                    alt={`${startup.companyName} image ${i + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <Info label="HQ" value={startup.hq} />
            <Info label="Founded" value={startup.foundingYear?.toString() || "—"} />
            <Info label="Employees" value={startup.employees || "—"} />
            <Info label="Total Investment" value={startup.investments || "—"} />
            <Info label="Added" value={startup.addedDate} />
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Project</p>
              <select
                value={startup.projectId || ""}
                onChange={(e) => onUpdate({ ...startup, projectId: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Unassigned —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">About</p>
            <p className="text-sm text-gray-700 leading-relaxed">{startup.longDescription}</p>
          </div>

          {startup.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {startup.tags.map((t) => <TagBadge key={t} tag={t} />)}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Video</p>
              {!editingVideo && (
                <button
                  onClick={() => setEditingVideo(true)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {startup.videoUrl ? "Edit" : "+ Add video URL"}
                </button>
              )}
            </div>
            {editingVideo ? (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") saveVideo(); if (e.key === "Escape") setEditingVideo(false); }}
                />
                <button onClick={saveVideo} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save</button>
                <button onClick={() => setEditingVideo(false)} className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              </div>
            ) : startup.videoUrl ? (
              <a href={startup.videoUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all">
                {startup.videoUrl}
              </a>
            ) : (
              <p className="text-sm text-gray-400 italic">No video URL</p>
            )}
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 text-center bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {exporting ? "Exporting..." : "📊 Export PPT"}
            </button>
            {startup.websiteUrl && (
              <a
                href={startup.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Visit Website
              </a>
            )}
            <button
              onClick={() => { onDelete(startup.id); onClose(); }}
              className="px-4 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}
