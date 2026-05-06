import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import * as cheerio from "cheerio";

const TAGS = ["AI", "BCI", "Enterprise", "Media", "Mobility", "Sustainability", "Fintech", "Healthtech", "Climate", "Web3", "Robotics", "Space"];


interface PageData {
  title: string;
  metaDesc: string;
  images: string[];
  videoLinks: string[];
  jsonLd: unknown[];
  bodyText: string;
}

function extractVideoLinks($: ReturnType<typeof cheerio.load>, baseUrl: string): string[] {
  const found = new Set<string>();
  // og:video meta
  const ogVideo =
    $('meta[property="og:video"]').attr("content") ||
    $('meta[property="og:video:url"]').attr("content") || "";
  if (ogVideo) found.add(ogVideo);
  // <iframe> embeds
  $("iframe[src]").each((_, el) => {
    const src = $(el).attr("src") || "";
    if (/youtube\.com|youtu\.be|vimeo\.com/.test(src)) found.add(src);
  });
  // <a href> links
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (/youtube\.com|youtu\.be|vimeo\.com/.test(href)) {
      try { found.add(new URL(href, baseUrl).href); } catch {}
    }
  });
  return [...found].slice(0, 5);
}

function companyNameFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const name = hostname.split(".")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return "";
  }
}

async function fetchVideoMeta(videoUrl: string): Promise<{ url: string; text: string }> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { url: videoUrl, text: "" };
    const data = await res.json() as { title?: string; author_name?: string };
    return { url: videoUrl, text: `${data.title ?? ""} ${data.author_name ?? ""}`.toLowerCase() };
  } catch {
    return { url: videoUrl, text: "" };
  }
}

async function searchYouTube(companyName: string): Promise<string[]> {
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(companyName)}`;
  const res = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(8000),
  });
  const html = await res.text();

  // Collect up to 10 unique candidate URLs (watch + shorts)
  const candidates: string[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/\/watch\?v=([\w-]{11})|\/shorts\/([\w-]{11})/g)) {
    const id = m[1] ?? m[2];
    if (seen.has(id)) continue;
    seen.add(id);
    const isShort = !!m[2];
    candidates.push(isShort ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`);
    if (candidates.length >= 10) break;
  }

  // Verify relevance: keep only videos whose title or channel mentions the company name
  const companyLower = companyName.toLowerCase();
  const metas = await Promise.all(candidates.map(fetchVideoMeta));
  return metas
    .filter((m) => m.text.includes(companyLower))
    .slice(0, 3)
    .map((m) => m.url);
}

async function fetchViaJina(url: string): Promise<string> {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: { "Accept": "text/plain", "User-Agent": "Mozilla/5.0 (compatible; StartupResearcher/1.0)" },
    signal: AbortSignal.timeout(15000),
  });
  return res.text();
}

async function scrapePage(url: string): Promise<PageData> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; StartupResearcher/1.0)" },
    signal: AbortSignal.timeout(10000),
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  // JSON-LD often has foundingDate, numberOfEmployees, address
  const jsonLd: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try { jsonLd.push(JSON.parse($(el).html() || "")); } catch {}
  });

  // Try to follow an "About" link for richer metadata
  let aboutHref = "";
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim().toLowerCase();
    if ((text === "about" || text === "about us" || text === "company") && !aboutHref) {
      try { aboutHref = new URL(href, url).href; } catch {}
    }
  });

  $("script, style, nav, footer, header").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 8000);
  const title = $("title").text();
  const metaDesc = $('meta[name="description"]').attr("content") || "";

  // Collect images: og:image, twitter:image, then <img> tags
  const images: string[] = [];
  const ogImage = $('meta[property="og:image"]').attr("content") || "";
  const twitterImage = $('meta[name="twitter:image"]').attr("content") || "";
  if (ogImage) images.push(ogImage);
  if (twitterImage && twitterImage !== ogImage) images.push(twitterImage);
  $("img[src]").each((_, el) => {
    if (images.length >= 8) return false as unknown as void;
    const src = $(el).attr("src") || "";
    if (!src || src.startsWith("data:") || src.length < 10 || images.includes(src)) return;
    try { images.push(new URL(src, url).href); } catch {}
  });

  const videoLinks = extractVideoLinks($, url);

  // Fetch About page if found and distinct
  if (aboutHref && aboutHref !== url) {
    try {
      const aboutRes = await fetch(aboutHref, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; StartupResearcher/1.0)" },
        signal: AbortSignal.timeout(8000),
      });
      const aboutHtml = await aboutRes.text();
      const $a = cheerio.load(aboutHtml);
      $a('script[type="application/ld+json"]').each((_, el) => {
        try { jsonLd.push(JSON.parse($a(el).html() || "")); } catch {}
      });
      const aboutVideoLinks = extractVideoLinks($a, url);
      aboutVideoLinks.forEach((v) => { if (!videoLinks.includes(v)) videoLinks.push(v); });
      $a("script, style, nav, footer, header").remove();
      const aboutText = $a("body").text().replace(/\s+/g, " ").trim().slice(0, 3000);
      return { title, metaDesc, images, videoLinks, jsonLd, bodyText: bodyText + " [ABOUT PAGE] " + aboutText };
    } catch {}
  }

  // If the page yielded almost no text (likely a JS-rendered SPA), fall back to Jina Reader
  // Note: we do NOT extract video links from Jina text — Jina renders the full page including
  // YouTube sidebar recommendations which are unrelated to the startup.
  if (bodyText.length < 300) {
    try {
      const jinaText = await fetchViaJina(url);
      return { title, metaDesc, images, videoLinks, jsonLd, bodyText: jinaText.slice(0, 10000) };
    } catch {}
  }

  return { title, metaDesc, images, videoLinks, jsonLd, bodyText };
}

export async function POST(req: NextRequest) {
  const { url, apiKey } = await req.json();
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });
  if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 401 });

  const client = new Anthropic({ apiKey });

  let pageDataStr = `{"error": "Could not fetch page", "url": "${url}"}`;
  let resolvedVideoUrl = "";
  try {
    const pageData = await scrapePage(url);

    // Verify page-scraped video links via oEmbed before trusting them
    const companyName = companyNameFromUrl(url);
    const companyLower = companyName.toLowerCase();
    const verifiedPageLinks: string[] = [];
    if (pageData.videoLinks.length > 0) {
      const metas = await Promise.all(pageData.videoLinks.map(fetchVideoMeta));
      for (const m of metas) {
        if (m.text.includes(companyLower)) verifiedPageLinks.push(m.url);
      }
    }

    // If no verified links on the page, search YouTube
    if (verifiedPageLinks.length === 0 && companyName) {
      const ytResults = await searchYouTube(companyName).catch(() => []);
      verifiedPageLinks.push(...ytResults);
    }

    // Resolve video URL server-side — Claude never decides this
    resolvedVideoUrl = verifiedPageLinks[0] ?? "";
    pageData.videoLinks = verifiedPageLinks;
    pageDataStr = JSON.stringify(pageData);
  } catch {}

  const prompt = `You are a startup research assistant helping NTT Docomo source investment targets.

Startup URL: ${url}

Scraped page data (JSON-LD structured data, images list, and body text):
${pageDataStr}

Instructions:
IMPORTANT: The scraped page data is the ground truth for what this company does. Base companyName, shortDescription, longDescription, and tags ENTIRELY on the page content. Do NOT apply knowledge of any similarly-named person, publication, brand, or other entity from your training data — even if the name is familiar. The URL and page content define this company's identity.

1. Extract company info from the scraped data. In the JSON-LD, look for fields like "foundingDate", "foundedDate", "numberOfEmployees", "address", "addressLocality", "addressCountry".
2. For hq, foundingYear, and employees ONLY: if not found in the page data, you may use training knowledge about THIS specific company at THIS URL as a secondary source. Even then, if anything in the page contradicts your training knowledge, trust the page.
3. For hq, foundingYear, and employees: make your best determination. Do NOT output null or leave these blank unless the company is genuinely so obscure you have no information at all. Even an approximate answer (e.g. "~2015", "100–500") is better than blank.
4. For imageUrls: select the 3 best URLs from the "images" array in the page data (logo, product screenshot, team photo). Fill unused slots with "".
5. Do not include a videoUrl field — it is handled separately.

Return ONLY valid JSON — no markdown fences, no explanation, nothing before or after the JSON object:
{
  "companyName": "string",
  "shortDescription": "string — exactly 5 words, catchy tagline",
  "longDescription": "string — ~200 words on what the company does, its mission, product, market, and why it's interesting for investors",
  "hq": "string — City, Country (e.g. 'San Francisco, USA')",
  "foundingYear": number or null,
  "employees": "string — headcount range (e.g. '50–200', '1,000+', '<50')",
  "imageUrls": ["url1", "url2", "url3"],
  "tags": ["tag1", "tag2"] — 1–4 tags chosen from: ${TAGS.join(", ")}
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  let parsed;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response", raw }, { status: 500 });
  }

  if (!Array.isArray(parsed.imageUrls)) parsed.imageUrls = ["", "", ""];
  while (parsed.imageUrls.length < 3) parsed.imageUrls.push("");
  parsed.imageUrls = parsed.imageUrls.slice(0, 3);
  parsed.videoUrl = resolvedVideoUrl;

  return NextResponse.json(parsed);
}
