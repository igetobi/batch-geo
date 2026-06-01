import { useState } from "react";
import type { JobStatus, MapResult, MapRequest } from "../api";
import { publishMap, pollJobUntilDone } from "../api";

interface Props {
  status: JobStatus;
  onStartOver: () => void;
  /** Passed so the retry button (item 7) can re-call /api/publish. */
  mapResult?: MapResult;
  mapRequest?: MapRequest;
  onJobDone?: (status: JobStatus) => void;
}

export default function ResultPanel({
  status: initialStatus,
  onStartOver,
  mapResult,
  mapRequest,
  onJobDone,
}: Props) {
  const [status, setStatus] = useState<JobStatus>(initialStatus);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedCsv, setCopiedCsv] = useState(false);
  // item 7: retry state
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  async function copy(
    text: string,
    setFlag: (v: boolean) => void
  ) {
    await navigator.clipboard.writeText(text);
    setFlag(true);
    setTimeout(() => setFlag(false), 2000);
  }

  // item 7: retry automatic publish
  async function handleRetryPublish() {
    if (!mapResult || !mapRequest) return;
    setRetryError(null);
    setRetrying(true);
    try {
      const { job_id } = await publishMap(mapResult, mapRequest);
      const cancel = pollJobUntilDone(job_id, (newStatus) => {
        if (newStatus.state !== "publishing" && newStatus.state !== "generating") {
          cancel();
          setRetrying(false);
          setStatus(newStatus);
          onJobDone?.(newStatus);
        }
      });
    } catch (err) {
      setRetrying(false);
      setRetryError(err instanceof Error ? err.message : "Retry failed");
    }
  }

  const isDone = status.state === "done";
  const isManual = status.state === "needs_manual_finish";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          {isDone ? (
            <>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Map Published!
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Your BatchGeo map is live and ready to embed.
              </p>
            </>
          ) : isManual ? (
            <>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 mb-4">
                <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Manual Finish Required
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                The automatic publish couldn't complete. Follow the steps below
                to finish manually — your spreadsheet is ready to go.
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mb-4">
                <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Something went wrong
              </h1>
              {status.message && (
                <p className="mt-2 text-sm text-slate-500 bg-slate-100 rounded-lg px-4 py-2 inline-block">
                  {status.message}
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Done: map URL + embed code ── */}
        {isDone && status.message && (
          <div className="space-y-4">
            {/* Map URL */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-800">
                  Map URL
                </h2>
                <CopyButton
                  copied={copiedUrl}
                  onClick={() => copy(status.message!, setCopiedUrl)}
                />
              </div>
              <a
                href={status.message}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-indigo-600 hover:text-indigo-800 font-medium break-all underline underline-offset-2"
              >
                {status.message}
              </a>
            </div>

            {/* Embed code — build from job message URL */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-800">
                  Embed Code
                </h2>
                <CopyButton
                  copied={copiedEmbed}
                  onClick={() => {
                    const embedCode = buildEmbedCode(status.message!);
                    copy(embedCode, setCopiedEmbed);
                  }}
                />
              </div>
              <pre className="text-xs text-slate-700 bg-slate-50 rounded-lg p-4 overflow-x-auto leading-relaxed border border-slate-200 whitespace-pre-wrap break-all">
                {buildEmbedCode(status.message)}
              </pre>
              <p className="mt-2 text-xs text-slate-500">
                Paste this snippet into the client's website HTML where you want
                the map to appear.
              </p>
            </div>
          </div>
        )}

        {/* ── Manual finish: instructions + CSV + retry button ── */}
        {isManual && status.payload && (
          <div className="space-y-4">
            {/* Steps */}
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-4">
                Steps to publish manually
              </h2>
              <ol className="space-y-3">
                {status.payload.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700">
                    <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">
                      {/* Strip the leading "1. " etc that the backend already includes */}
                      {step.replace(/^\d+\.\s*/, "")}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* CSV copy box */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-800">
                  Spreadsheet Data (CSV)
                </h2>
                <CopyButton
                  copied={copiedCsv}
                  onClick={() =>
                    copy(status.payload!.csv_text, setCopiedCsv)
                  }
                  label="Copy all"
                />
              </div>
              <textarea
                readOnly
                value={status.payload.csv_text}
                rows={10}
                className="w-full text-xs text-slate-700 bg-slate-50 rounded-lg p-4 border border-slate-200 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-2 text-xs text-slate-500">
                Select all and copy, or use the button above.
              </p>
            </div>

            {/* item 7: Retry automatic publish */}
            {mapResult && mapRequest && (
              <div className="space-y-2">
                {retryError && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {retryError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleRetryPublish}
                  disabled={retrying}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {retrying ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Retrying automatic publish…
                    </span>
                  ) : (
                    "Try automatic publish again"
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Start over */}
        <button
          type="button"
          onClick={onStartOver}
          className="w-full py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          Generate another map
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildEmbedCode(mapUrl: string | null): string {
  if (!mapUrl) return "";
  return `<div class="batchgeo-map-outer" style="width:100%;padding-bottom:56.25%;position:relative;"><iframe src="${mapUrl}" style="width:100%;height:100%;position:absolute;top:0;left:0;border:0;" allowfullscreen loading="lazy"></iframe></div>`;
}

function CopyButton({
  copied,
  onClick,
  label = "Copy",
}: {
  copied: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
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
