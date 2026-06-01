import { useEffect, useRef, useState } from "react";
import type { MapResult, MapRequest, JobStatus } from "../api";
import { publishMap, pollJobUntilDone } from "../api";

interface Props {
  result: MapResult;
  request: MapRequest;
  onJobDone: (status: JobStatus) => void;
  onBack: () => void;
  /** Called with the job id right after /api/publish responds, so App.tsx can
   *  persist it for refresh-resume (item 1). */
  onPublishStarted?: (jobId: string) => void;
}

export default function MapPreview({
  result,
  request,
  onJobDone,
  onBack,
  onPublishStarted,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<import("leaflet").Map | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // item 4: show-more toggle for description
  const [descExpanded, setDescExpanded] = useState(false);

  // ── Leaflet map ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || result.pins.length === 0) return;
    if (leafletMapRef.current) return; // already initialised

    // Dynamic import so Leaflet is not in the initial bundle critical path.
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !mapContainerRef.current) return;

      // Leaflet default icon fix (webpack/vite asset path issue).
      const iconUrl =
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
      const iconRetinaUrl =
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
      const shadowUrl =
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
      const DefaultIcon = L.icon({
        iconUrl,
        iconRetinaUrl,
        shadowUrl,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      L.Marker.prototype.options.icon = DefaultIcon;

      // Centre the map on the average of all pins.
      const lats = result.pins.map((p) => p.latitude);
      const lons = result.pins.map((p) => p.longitude);
      const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const centerLon = lons.reduce((a, b) => a + b, 0) / lons.length;

      const map = L.map(mapContainerRef.current!).setView(
        [centerLat, centerLon],
        12
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      result.pins.forEach((pin) => {
        L.marker([pin.latitude, pin.longitude])
          .addTo(map)
          .bindPopup(
            `<div class="text-xs font-medium leading-snug max-w-xs">${pin.keyword_title}</div>`
          );
      });

      leafletMapRef.current = map;
    });

    return () => {
      cancelled = true;
    };
  }, [result.pins]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // ── Publish ────────────────────────────────────────────────────────────────
  async function handlePublish() {
    setPublishError(null);
    setPublishing(true);
    try {
      const { job_id } = await publishMap(result, request);
      // item 1: notify App.tsx so it can persist the job id for refresh-resume
      onPublishStarted?.(job_id);
      const cancel = pollJobUntilDone(job_id, (status) => {
        if (
          status.state !== "publishing" &&
          status.state !== "generating"
        ) {
          cancel();
          setPublishing(false);
          onJobDone(status);
        }
      });
    } catch (err) {
      setPublishing(false);
      setPublishError(
        err instanceof Error ? err.message : "Failed to start publish job"
      );
    }
  }

  // ── Copy CSV ───────────────────────────────────────────────────────────────
  async function copyCSV() {
    await navigator.clipboard.writeText(result.csv_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const pinCount = result.pins.length;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Map Preview
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {pinCount} keyword pins generated for{" "}
              <span className="font-medium text-slate-700">
                {request.client.business_name}
              </span>{" "}
              in {request.client.city}, {request.client.state}
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to form
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Pins" value={String(pinCount)} />
          <StatCard label="Services" value={String(request.services.length)} />
          <StatCard label="Landmarks" value={String(request.landmarks.length)} />
        </div>

        {/* Leaflet map */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">
              Pin Preview Map
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click a pin to see its keyword title.
            </p>
          </div>
          {/* Leaflet CSS */}
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          />
          <div
            ref={mapContainerRef}
            style={{ height: 380 }}
            className="w-full"
          />
        </div>

        {/* Keyword titles list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Keyword Titles
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                These titles become the pin labels in BatchGeo.
              </p>
            </div>
            <button
              type="button"
              onClick={copyCSV}
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
                  Copy CSV
                </>
              )}
            </button>
          </div>
          <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {result.pins.map((pin, i) => (
              <li
                key={i}
                className="flex items-center gap-3 px-5 py-2.5 text-sm"
              >
                <span className="text-xs text-slate-400 w-6 text-right flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-slate-700">{pin.keyword_title}</span>
                <span className="ml-auto text-xs text-slate-400 flex-shrink-0">
                  {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* item 4: Description preview with show more / show less toggle */}
        {result.description && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">
              Generated Description
            </h2>
            <p
              className={`text-sm text-slate-600 leading-relaxed${
                descExpanded ? "" : " line-clamp-4"
              }`}
            >
              {result.description}
            </p>
            <button
              type="button"
              onClick={() => setDescExpanded((v) => !v)}
              className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
            >
              {descExpanded ? "Show less" : "Show more"}
            </button>
          </div>
        )}

        {/* Publish error */}
        {publishError && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {publishError}
          </div>
        )}

        {/* Publish button */}
        <button
          type="button"
          onClick={handlePublish}
          disabled={publishing}
          className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {publishing ? (
            <span className="inline-flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Publishing to BatchGeo — this can take 1–3 minutes…
            </span>
          ) : (
            "Publish to BatchGeo"
          )}
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 text-center">
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
