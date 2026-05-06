import { Tag } from "../types";

const TAG_COLORS: Record<string, string> = {
  AI: "bg-violet-100 text-violet-800",
  BCI: "bg-pink-100 text-pink-800",
  Enterprise: "bg-blue-100 text-blue-800",
  Media: "bg-yellow-100 text-yellow-800",
  Mobility: "bg-green-100 text-green-800",
  Sustainability: "bg-emerald-100 text-emerald-800",
  Fintech: "bg-cyan-100 text-cyan-800",
  Healthtech: "bg-red-100 text-red-800",
  Climate: "bg-teal-100 text-teal-800",
  Web3: "bg-orange-100 text-orange-800",
  Robotics: "bg-slate-100 text-slate-800",
  Space: "bg-indigo-100 text-indigo-800",
};

export default function TagBadge({ tag }: { tag: Tag }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TAG_COLORS[tag] ?? "bg-gray-100 text-gray-700"}`}>
      {tag}
    </span>
  );
}
