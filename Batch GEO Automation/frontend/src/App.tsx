import { useEffect, useState } from "react";
import type { MapRequest, MapResult, JobStatus } from "./api";
import { pollJobUntilDone } from "./api";
import MapForm from "./components/MapForm";
import MapPreview from "./components/MapPreview";
import ResultPanel from "./components/ResultPanel";
import RecentMaps from "./components/RecentMaps";

// ---------------------------------------------------------------------------
// Session persistence — item 1
// ---------------------------------------------------------------------------

const SESSION_KEY = "bgmap_session";

interface PersistedSession {
  screenId: "form" | "preview" | "result";
  result?: MapResult;
  request?: MapRequest;
  status?: JobStatus;
  activeJobId?: string;
}

function loadSession(): PersistedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSession;
  } catch {
    return null;
  }
}

function saveSession(session: PersistedSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Screen states
// ---------------------------------------------------------------------------

type Screen =
  | { id: "form" }
  | { id: "preview"; result: MapResult; request: MapRequest }
  | { id: "result"; status: JobStatus }
  | { id: "recent" };

// Derive initial screen from persisted session
function deriveInitialScreen(): Screen {
  const session = loadSession();
  if (!session) return { id: "form" };

  if (session.screenId === "preview" && session.result && session.request) {
    return { id: "preview", result: session.result, request: session.request };
  }
  if (session.screenId === "result" && session.status) {
    return { id: "result", status: session.status };
  }
  return { id: "form" };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(deriveInitialScreen);

  // Keep result/request available so ResultPanel can use them for retry (item 7).
  // We stash them when moving to the preview screen and carry them forward.
  const [lastResult, setLastResult] = useState<MapResult | undefined>(() => {
    const s = loadSession();
    return s?.result;
  });
  const [lastRequest, setLastRequest] = useState<MapRequest | undefined>(() => {
    const s = loadSession();
    return s?.request;
  });

  // If a publish job was in-progress when the user refreshed, resume polling.
  useEffect(() => {
    const session = loadSession();
    if (
      session?.screenId === "preview" &&
      session.activeJobId &&
      session.result &&
      session.request
    ) {
      const jobId = session.activeJobId;
      const cancel = pollJobUntilDone(jobId, (status) => {
        if (status.state !== "publishing" && status.state !== "generating") {
          cancel();
          handleJobDone(status);
        }
      });
      return cancel;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist screen state whenever it changes.
  useEffect(() => {
    if (screen.id === "recent") {
      return;
    }
    if (screen.id === "form") {
      saveSession({ screenId: "form" });
    } else if (screen.id === "preview") {
      saveSession({ screenId: "preview", result: screen.result, request: screen.request });
    } else if (screen.id === "result") {
      saveSession({ screenId: "result", status: screen.status, result: lastResult, request: lastRequest });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  function handleGenerated(result: MapResult, request: MapRequest) {
    setLastResult(result);
    setLastRequest(request);
    setScreen({ id: "preview", result, request });
  }

  function handleJobDone(status: JobStatus) {
    setScreen({ id: "result", status });
  }

  function handleStartOver() {
    clearSession();
    setScreen({ id: "form" });
  }

  function handleBackToForm() {
    setScreen({ id: "form" });
  }

  function handleShowRecent() {
    setScreen({ id: "recent" });
  }

  // Persist the active job id into session so a refresh can resume polling.
  function handlePublishStarted(jobId: string) {
    const session = loadSession();
    if (session) {
      saveSession({ ...session, activeJobId: jobId });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* z-[1000] keeps the header above Leaflet panes (z-index 400) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-[1000]">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-800">
              BatchGeo Map Generator
            </span>
          </div>

          {/* Step indicator */}
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
            <Step label="Form" active={screen.id === "form"} done={screen.id === "preview" || screen.id === "result"} />
            <Divider />
            <Step label="Preview" active={screen.id === "preview"} done={screen.id === "result"} />
            <Divider />
            <Step label="Result" active={screen.id === "result"} done={false} />
          </div>

          <div className="flex items-center gap-3">
            {/* Recent maps nav link */}
            {screen.id !== "recent" && (
              <button
                type="button"
                onClick={handleShowRecent}
                className="text-xs text-slate-500 hover:text-indigo-600 transition hidden sm:block"
              >
                Recent maps
              </button>
            )}
            {screen.id === "recent" && (
              <button
                type="button"
                onClick={handleBackToForm}
                className="text-xs text-slate-500 hover:text-slate-800 transition hidden sm:block"
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Screens */}
      {screen.id === "form" && (
        <MapForm onResult={handleGenerated} onShowRecent={handleShowRecent} />
      )}
      {screen.id === "preview" && (
        <MapPreview
          result={screen.result}
          request={screen.request}
          onJobDone={handleJobDone}
          onBack={handleBackToForm}
          onPublishStarted={handlePublishStarted}
        />
      )}
      {screen.id === "result" && (
        <ResultPanel
          status={screen.status}
          onStartOver={handleStartOver}
          mapResult={lastResult}
          mapRequest={lastRequest}
          onJobDone={handleJobDone}
        />
      )}
      {screen.id === "recent" && (
        <RecentMaps onBack={handleBackToForm} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step indicator sub-components
// ---------------------------------------------------------------------------

function Step({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <span
      className={
        active
          ? "text-indigo-600 font-semibold"
          : done
          ? "text-slate-600"
          : "text-slate-400"
      }
    >
      {done ? (
        <span className="inline-flex items-center gap-1">
          <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {label}
        </span>
      ) : (
        label
      )}
    </span>
  );
}

function Divider() {
  return <span className="text-slate-300 mx-1">›</span>;
}
