"use client";

import { useState } from "react";
import { Startup, Tag } from "../types";
import TagBadge from "./TagBadge";
import { v4 as uuidv4 } from "uuid";
import { API_KEY_STORAGE } from "./ApiKeyModal";

const ALL_TAGS: Tag[] = ["AI", "BCI", "Enterprise", "Media", "Mobility", "Sustainability", "Fintech", "Healthtech", "Climate", "Web3", "Robotics", "Space"];

interface Props {
  onSave: (s: Startup) => void;
  onClose: () => void;
}

const empty = (): Partial<Startup> => ({
  companyName: "",
  shortDescription: "",
  longDescription: "",
  hq: "",
  foundingYear: null,
  employees: "",
  videoUrl: "",
  imageUrls: ["", "", ""],
  tags: [],
  websiteUrl: "",
});

export default function AddStartupModal({ onSave, onClose }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Partial<Startup>>(empty());
  const [step, setStep] = useState<"url" | "review">("url");

  async function handleResearch() {
    if (!url) return;
    setLoading(true);
    setError("");
    try {
      const apiKey = localStorage.getItem(API_KEY_STORAGE) || "";
      if (!apiKey) {
        setError("No API key set. Click 'Set API Key' in the header first.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Research failed");
      setForm({ ...data, websiteUrl: url, imageUrls: data.imageUrls ?? ["", "", ""] });
      setStep("review");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (!form.companyName) return;
    const startup: Startup = {
      id: uuidv4(),
      addedDate: new Date().toISOString().split("T")[0],
      companyName: form.companyName!,
      shortDescription: form.shortDescription || "",
      longDescription: form.longDescription || "",
      hq: form.hq || "",
      foundingYear: form.foundingYear ?? null,
      employees: form.employees || "",
      videoUrl: form.videoUrl || "",
      imageUrls: form.imageUrls as [string, string, string],
      tags: form.tags || [],
      websiteUrl: form.websiteUrl || url,
    };
    onSave(startup);
  }

  function toggleTag(t: Tag) {
    setForm((f) => {
      const tags = f.tags || [];
      return {
        ...f,
        tags: tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t],
      };
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === "url" ? "Add Startup" : "Review & Save"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-5">
          {step === "url" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Startup Website URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleResearch()}
                  placeholder="https://example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                onClick={handleResearch}
                disabled={loading || !url}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Researching…" : "Research with AI"}
              </button>
            </>
          ) : (
            <>
              <Field label="Company Name" required>
                <input
                  value={form.companyName || ""}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="input"
                />
              </Field>

              <Field label="Short Description (5 words)">
                <input
                  value={form.shortDescription || ""}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                  className="input"
                />
              </Field>

              <Field label="Long Description (~200 words)">
                <textarea
                  value={form.longDescription || ""}
                  onChange={(e) => setForm({ ...form, longDescription: e.target.value })}
                  rows={6}
                  className="input resize-none"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="HQ">
                  <input
                    value={form.hq || ""}
                    onChange={(e) => setForm({ ...form, hq: e.target.value })}
                    className="input"
                    placeholder="City, Country"
                  />
                </Field>
                <Field label="Founding Year">
                  <input
                    type="number"
                    value={form.foundingYear ?? ""}
                    onChange={(e) => setForm({ ...form, foundingYear: e.target.value ? parseInt(e.target.value) : null })}
                    className="input"
                    placeholder="2020"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="# Employees">
                  <input
                    value={form.employees || ""}
                    onChange={(e) => setForm({ ...form, employees: e.target.value })}
                    className="input"
                    placeholder="50–200"
                  />
                </Field>
                <Field label="Website URL">
                  <input
                    value={form.websiteUrl || ""}
                    onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>

              <Field label="Related Video URL">
                <input
                  value={form.videoUrl || ""}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                  className="input"
                  placeholder="https://youtube.com/..."
                />
              </Field>

              <Field label="Image URLs (logo, product, team)">
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      value={(form.imageUrls as string[])[i] || ""}
                      onChange={(e) => {
                        const arr = [...(form.imageUrls as string[])];
                        arr[i] = e.target.value;
                        setForm({ ...form, imageUrls: arr as [string, string, string] });
                      }}
                      className="input"
                      placeholder={["Logo URL", "Product screenshot URL", "Team/office URL"][i]}
                    />
                  ))}
                </div>
              </Field>

              <Field label="Tags">
                <div className="flex flex-wrap gap-2">
                  {ALL_TAGS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        (form.tags || []).includes(t)
                          ? "border-transparent"
                          : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {(form.tags || []).includes(t) ? <TagBadge tag={t} /> : t}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep("url")}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.companyName}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Save Startup
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
