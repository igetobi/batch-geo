import { useEffect, useState } from "react";
import type { SavedMap } from "../api";
import { listMaps, downloadCsv, downloadXlsx } from "../api";

interface Props {
  onBack: () => void;
}

export default function RecentMaps({ onBack }: Props) {
  const [maps, setMaps] = useState<SavedMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [xlsxLoadingId, setXlsxLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listMaps()
      .then((data) => {
        if (!cancelled) setMaps(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load maps");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyText(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function pinCount(csvText: string): number {
    // CSV has 1 header row; each subsequent non-empty line is a pin
    return csvText.split("\n").filter((l, i) => i > 0 && l.trim()).length;
  }

  function formatDate(iso: string): string {
    try {
      const normalized = iso.includes("T") ? iso : iso.replace(" ", "T");
      const d = new Date(normalized.endsWith("Z") ? normalized : normalized + "Z");
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Recent Maps
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              All maps generated and saved in this account, newest first.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition flex-shrink-0 mt-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to form
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <svg className="animate-spin w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading maps…
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && maps.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium">No maps yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Generate your first map to see it here.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition"
            >
              Generate a map
            </button>
          </div>
        )}

        {/* Map list */}
        {!loading && !error && maps.length > 0 && (
          <div className="space-y-4">
            {maps.map((map) => {
              const pins = pinCount(map.csv_text);
              const isPublished = !!map.map_url;
              const isExpanded = expandedId === map.id;

              return (
                <div
                  key={map.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Top row */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-sm font-semibold text-slate-900 truncate">
                            {map.title}
                          </h2>
                          {/* Status badge */}
                          {isPublished ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 flex-shrink-0">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              Manual finish
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDate(map.created_at)}
                          <span className="mx-1.5 text-slate-300">·</span>
                          <span>{pins} pins</span>
                          <span className="mx-1.5 text-slate-300">·</span>
                          <span className="font-mono">{map.slug}</span>
                        </p>
                      </div>

                      {/* View map link */}
                      {map.map_url && (
                        <a
                          href={map.map_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-indigo-600 font-medium transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View map
                        </a>
                      )}
                    </div>

                    {/* Map URL row */}
                    {map.map_url && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <span className="text-xs text-slate-500 truncate block font-mono">
                          {map.map_url}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Description preview */}
                  {map.description && (
                    <div className="px-5 pb-4">
                      <p
                        className={`text-xs text-slate-600 leading-relaxed ${
                          isExpanded ? "" : "line-clamp-2"
                        }`}
                      >
                        {map.description}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : map.id)
                        }
                        className="mt-1 text-xs text-indigo-500 hover:text-indigo-700 transition"
                      >
                        {isExpanded ? "Show less" : "Show full description"}
                      </button>
                    </div>
                  )}

                  {/* Action bar */}
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                    {/* Copy embed */}
                    {map.embed_code && (
                      <CopyButton
                        label="Copy embed code"
                        copiedLabel="Copied!"
                        isCopied={copiedId === `embed-${map.id}`}
                        onClick={() =>
                          copyText(map.embed_code!, `embed-${map.id}`)
                        }
                      />
                    )}

                    {/* Copy CSV */}
                    <CopyButton
                      label="Copy CSV"
                      copiedLabel="Copied!"
                      isCopied={copiedId === `csv-${map.id}`}
                      onClick={() => copyText(map.csv_text, `csv-${map.id}`)}
                    />

                    {/* Download CSV */}
                    <button
                      type="button"
                      onClick={() => downloadCsv(map.csv_text, map.slug)}
                      className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition flex-shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download CSV
                    </button>

                    {/* Download XLSX */}
                    <button
                      type="button"
                      onClick={async () => {
                        setXlsxLoadingId(map.id);
                        try { await downloadXlsx(map.csv_text, map.slug); } catch { /* ignore */ }
                        setXlsxLoadingId(null);
                      }}
                      disabled={xlsxLoadingId === map.id}
                      className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 disabled:opacity-50 transition flex-shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {xlsxLoadingId === map.id ? "Preparing…" : "Download XLSX"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CopyButton({
  label,
  copiedLabel,
  isCopied,
  onClick,
}: {
  label: string;
  copiedLabel: string;
  isCopied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition flex-shrink-0"
    >
      {isCopied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {copiedLabel}
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
