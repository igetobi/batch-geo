import { useRef, useState } from "react";
import type { MapRequest, MapResult } from "../api";
import { fetchCitationsFromSheet, generateMap } from "../api";

// ---------------------------------------------------------------------------
// Niche presets
// ---------------------------------------------------------------------------

const NICHE_PRESETS: Record<string, string[]> = {
  "": [],
  Cabinets: [
    "cabinet refacing",
    "custom kitchen cabinets",
    "cabinet installation",
    "cabinet painting",
    "kitchen cabinet remodel",
  ],
  Windows: [
    "window replacement",
    "window installation",
    "energy efficient windows",
    "double pane windows",
    "window repair",
  ],
  Roofing: [
    "roof replacement",
    "roof repair",
    "shingle roofing",
    "roof inspection",
    "gutter installation",
  ],
  Plumbing: [
    "plumbing repair",
    "drain cleaning",
    "water heater installation",
    "pipe repair",
    "emergency plumber",
  ],
  HVAC: [
    "AC installation",
    "furnace repair",
    "HVAC maintenance",
    "air conditioner replacement",
    "heating and cooling service",
  ],
  "Landscaping": [
    "lawn care",
    "landscape design",
    "tree trimming",
    "sod installation",
    "sprinkler system installation",
  ],
  Flooring: [
    "hardwood floor installation",
    "laminate flooring",
    "tile installation",
    "carpet installation",
    "floor refinishing",
  ],
  Painting: [
    "interior painting",
    "exterior painting",
    "house painting",
    "commercial painting",
    "deck staining",
  ],
};

// ---------------------------------------------------------------------------
// Props & component
// ---------------------------------------------------------------------------

interface Props {
  onResult: (result: MapResult, request: MapRequest) => void;
  onShowRecent: () => void; // item 8
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// item 5: field validation errors
interface FieldErrors {
  businessName?: string;
  phone?: string;
  email?: string;
  website?: string;
  city?: string;
  state?: string;
  services?: string;
}

export default function MapForm({ onResult, onShowRecent }: Props) {
  // Client fields
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("https://");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  // New entity-stacking fields
  const [gmbCid, setGmbCid] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>(["", "", "", "", ""]);
  const [socialUrlsText, setSocialUrlsText] = useState("");
  const [videoIframes, setVideoIframes] = useState<Record<string, string>>({
    youtube: "",
    my_maps: "",
    sheets: "",
    docs: "",
    pearltrees: "",
  });

  // Map fields
  const [niche, setNiche] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState("");
  const [landmarks, setLandmarks] = useState<string[]>([]);
  const [landmarkInput, setLandmarkInput] = useState("");
  const [mapTitle, setMapTitle] = useState("");
  const [pinCount, setPinCount] = useState(50);
  const [seed, setSeed] = useState("");

  // Citation sheet import
  const [citationSheetUrl, setCitationSheetUrl] = useState("");
  const [fetchingSheet, setFetchingSheet] = useState(false);
  const [sheetFetchError, setSheetFetchError] = useState<string | null>(null);
  const [sheetFetchSuccess, setSheetFetchSuccess] = useState(false);

  async function handleFetchSheet() {
    if (!citationSheetUrl.trim()) return;
    setFetchingSheet(true);
    setSheetFetchError(null);
    setSheetFetchSuccess(false);
    try {
      const result = await fetchCitationsFromSheet(citationSheetUrl.trim());
      if (result.gmb_cid) setGmbCid(result.gmb_cid);
      if (result.citations.length > 0) {
        setSocialUrlsText(result.citations.join("\n"));
      }
      setSheetFetchSuccess(true);
    } catch (err) {
      setSheetFetchError(err instanceof Error ? err.message : "Failed to fetch sheet");
    } finally {
      setFetchingSheet(false);
    }
  }

  const [error, setError] = useState<string | null>(null);
  // item 5: per-field inline errors
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  // Refs for scrolling to first invalid field (item 5)
  const businessNameRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const websiteRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);

  // ---- Niche preset handler ----
  function applyNiche(selected: string) {
    setNiche(selected);
    if (selected && NICHE_PRESETS[selected]) {
      setServices(NICHE_PRESETS[selected]);
    }
  }

  // ---- Service chip helpers ----
  function addService() {
    const val = serviceInput.trim();
    if (val && !services.includes(val)) {
      setServices([...services, val]);
      // Clear services error once user adds one
      setFieldErrors((prev) => ({ ...prev, services: undefined }));
    }
    setServiceInput("");
  }
  function removeService(s: string) {
    setServices(services.filter((x) => x !== s));
  }

  // ---- Landmark chip helpers ----
  function addLandmark() {
    const val = landmarkInput.trim();
    if (val && !landmarks.includes(val)) {
      setLandmarks([...landmarks, val]);
    }
    setLandmarkInput("");
  }
  function removeLandmark(l: string) {
    setLandmarks(landmarks.filter((x) => x !== l));
  }

  // ---- Auto-slug ----
  function handleMapTitleChange(val: string) {
    setMapTitle(val);
  }

  // ---- item 5: validate and return errors + first ref to scroll to ----
  function validate(): { errors: FieldErrors; firstRef: React.RefObject<HTMLDivElement | null> | null } {
    const errors: FieldErrors = {};
    let firstRef: React.RefObject<HTMLDivElement | null> | null = null;

    function mark(key: keyof FieldErrors, msg: string, ref: React.RefObject<HTMLDivElement | null>) {
      errors[key] = msg;
      if (!firstRef) firstRef = ref;
    }

    if (!businessName.trim()) mark("businessName", "Business name is required.", businessNameRef);
    if (!phone.trim()) mark("phone", "Phone number is required.", phoneRef);
    if (!email.trim()) mark("email", "Email address is required.", emailRef);
    if (!website.trim() || website === "https://") mark("website", "Website URL is required.", websiteRef);
    if (!city.trim()) mark("city", "City is required.", cityRef);
    if (!state.trim()) mark("state", "State is required.", stateRef);
    if (services.length === 0) mark("services", "Add at least one service.", servicesRef);

    return { errors, firstRef };
  }

  // ---- Submit ----
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // item 5: run our own validation before submitting
    const { errors, firstRef } = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      firstRef?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setFieldErrors({});

    const parsedImageUrls = imageUrls.filter((u) => u.trim());
    const parsedSocialUrls = socialUrlsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const parsedVideoIframes = Object.fromEntries(
      Object.entries(videoIframes).filter(([, v]) => v.trim())
    );

    const request: MapRequest = {
      client: {
        business_name: businessName,
        phone,
        email,
        website,
        city,
        state,
        gmb_cid: gmbCid.trim() || null,
        image_urls: parsedImageUrls,
        social_urls: parsedSocialUrls,
        video_iframes: parsedVideoIframes,
      },
      services,
      landmarks,
      geo_modifiers: [],
      pin_count: pinCount,
      map_title: mapTitle || `${businessName} ${city}`,
      map_slug: slugify(mapTitle || `${businessName} ${city}`),
      bounding_box: null,
      seed: seed ? parseInt(seed) : null,
    };

    setLoading(true);
    try {
      const result = await generateMap(request);
      onResult(result, request);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Generate a Keyword-Grid Map
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Fill in the client details and services. The app will build 50
              keyword pins and publish the map to BatchGeo.
            </p>
          </div>
          {/* item 8: Recent maps button on form screen (mobile-visible) */}
          <button
            type="button"
            onClick={onShowRecent}
            className="sm:hidden flex-shrink-0 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition mt-1"
          >
            Recent maps
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* ── Section: Client info ── */}
          <Section title="Client Information">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Business Name" required error={fieldErrors.businessName} fieldRef={businessNameRef}>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => { setBusinessName(e.target.value); setFieldErrors((p) => ({ ...p, businessName: undefined })); }}
                  placeholder="My Quality Construction"
                  className={inputCls}
                  aria-invalid={!!fieldErrors.businessName}
                />
              </Field>
              <Field label="Phone Number" required error={fieldErrors.phone} fieldRef={phoneRef}>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setFieldErrors((p) => ({ ...p, phone: undefined })); }}
                  placeholder="(586) 222-8111"
                  className={inputCls}
                  aria-invalid={!!fieldErrors.phone}
                />
              </Field>
              <Field label="Email Address" required error={fieldErrors.email} fieldRef={emailRef}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
                  placeholder="info@example.com"
                  className={inputCls}
                  aria-invalid={!!fieldErrors.email}
                />
              </Field>
              <Field label="Website URL" required error={fieldErrors.website} fieldRef={websiteRef}>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => { setWebsite(e.target.value); setFieldErrors((p) => ({ ...p, website: undefined })); }}
                  placeholder="https://example.com"
                  className={inputCls}
                  aria-invalid={!!fieldErrors.website}
                />
              </Field>
              <Field label="City" required error={fieldErrors.city} fieldRef={cityRef}>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setFieldErrors((p) => ({ ...p, city: undefined })); }}
                  placeholder="Sterling Heights"
                  className={inputCls}
                  aria-invalid={!!fieldErrors.city}
                />
              </Field>
              <Field label="State (2-letter)" required error={fieldErrors.state} fieldRef={stateRef}>
                <input
                  type="text"
                  maxLength={2}
                  value={state}
                  onChange={(e) => { setState(e.target.value.toUpperCase()); setFieldErrors((p) => ({ ...p, state: undefined })); }}
                  placeholder="MI"
                  className={inputCls}
                  aria-invalid={!!fieldErrors.state}
                />
              </Field>
            </div>
            <Field
              label="GMB CID (Google My Business ID)"
              hint='Found in your Google Maps URL as "cid=XXXXXXXXX". Used to build keyword-grid Google Maps search URLs.'
            >
              <input
                type="text"
                value={gmbCid}
                onChange={(e) => setGmbCid(e.target.value)}
                placeholder="e.g. 1234567890123456789"
                className={inputCls}
              />
            </Field>
          </Section>

          {/* ── Section: GMB Images ── */}
          <Section title="GMB Image URLs (optional)">
            <p className="text-xs text-slate-500 -mt-1">
              Paste up to 5 Google My Business photo URLs. The app will cycle them across all pins in the Image column.
            </p>
            {imageUrls.map((url, i) => (
              <Field key={i} label={`Image ${i + 1}`}>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    const next = [...imageUrls];
                    next[i] = e.target.value;
                    setImageUrls(next);
                  }}
                  placeholder="https://lh3.googleusercontent.com/..."
                  className={inputCls}
                />
              </Field>
            ))}
          </Section>

          {/* ── Section: Citation Sheet Import ── */}
          <Section title="Import Citations from Google Sheet">
            <p className="text-xs text-slate-500 -mt-1">
              Paste the link to the client's Google Sheet. The app will pull the citation URLs and GMB CID automatically.
              The sheet must be shared with "Anyone with the link can view."
            </p>
            <Field label="Google Sheet URL">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={citationSheetUrl}
                  onChange={(e) => {
                    setCitationSheetUrl(e.target.value);
                    setSheetFetchError(null);
                    setSheetFetchSuccess(false);
                  }}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={handleFetchSheet}
                  disabled={fetchingSheet || !citationSheetUrl.trim()}
                  className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium transition whitespace-nowrap"
                >
                  {fetchingSheet ? "Fetching…" : "Fetch"}
                </button>
              </div>
              {sheetFetchError && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">{sheetFetchError}</p>
              )}
              {sheetFetchSuccess && (
                <p className="mt-1.5 text-xs text-green-600 font-medium">
                  Citations imported successfully{gmbCid ? ` — GMB CID auto-filled: ${gmbCid}` : ""}.
                </p>
              )}
            </Field>
          </Section>

          {/* ── Section: Social Citations ── */}
          <Section title="Social Citation URLs (optional)">
            <Field
              label="Citation URLs"
              hint="Paste one URL per line — up to 50. Each pin gets one citation URL in the Social column (cycled if fewer than pin count)."
            >
              <textarea
                rows={6}
                value={socialUrlsText}
                onChange={(e) => setSocialUrlsText(e.target.value)}
                placeholder={"https://yelp.com/biz/example\nhttps://facebook.com/example\nhttps://yellowpages.com/..."}
                className={`${inputCls} resize-none font-mono text-xs`}
              />
              <p className="mt-1.5 text-xs text-slate-400">
                {socialUrlsText.split("\n").filter((l) => l.trim()).length} / 50 URLs entered
              </p>
            </Field>
          </Section>

          {/* ── Section: Entity Iframes ── */}
          <Section title="Entity Stack Iframes (optional)">
            <p className="text-xs text-slate-500 -mt-1">
              Paste embed codes for each entity. All filled iframes are stacked into the Video column for every pin.
            </p>
            {(
              [
                ["youtube", "YouTube Embed"],
                ["my_maps", "Google My Maps Embed"],
                ["sheets", "Google Sheets Embed"],
                ["docs", "Google Docs Embed"],
                ["pearltrees", "Pearltrees Embed"],
              ] as [string, string][]
            ).map(([key, label]) => (
              <Field
                key={key}
                label={label}
              >
                <textarea
                  rows={2}
                  value={videoIframes[key]}
                  onChange={(e) =>
                    setVideoIframes((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder={`<iframe src="..." ...></iframe>`}
                  className={`${inputCls} resize-none font-mono text-xs`}
                />
              </Field>
            ))}
          </Section>

          {/* ── Section: Services ── */}
          <Section title="Services">
            <Field
              label="Niche Preset"
              hint="Choose a preset to auto-fill common services, then add or remove as needed."
            >
              <select
                value={niche}
                onChange={(e) => applyNiche(e.target.value)}
                className={inputCls}
              >
                <option value="">— choose a preset —</option>
                {Object.keys(NICHE_PRESETS)
                  .filter((k) => k !== "")
                  .map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
              </select>
            </Field>

            <Field
              label="Services"
              required
              hint="Each service generates keyword pins. Press Enter or click Add."
              error={fieldErrors.services}
              fieldRef={servicesRef}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={serviceInput}
                  onChange={(e) => setServiceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addService();
                    }
                  }}
                  placeholder="e.g. cabinet refacing"
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={addService}
                  className={chipBtnCls}
                >
                  Add
                </button>
              </div>
              <ChipList items={services} onRemove={removeService} color="indigo" />
            </Field>
          </Section>

          {/* ── Section: Landmarks ── */}
          <Section title="Local Landmarks">
            <Field
              label="Landmarks (optional)"
              hint='Names of local parks, malls, or major roads. Used to create "near X" keyword variants.'
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={landmarkInput}
                  onChange={(e) => setLandmarkInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addLandmark();
                    }
                  }}
                  placeholder="e.g. Dodge Park"
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={addLandmark}
                  className={chipBtnCls}
                >
                  Add
                </button>
              </div>
              <ChipList items={landmarks} onRemove={removeLandmark} color="emerald" />
            </Field>
          </Section>

          {/* ── Section: Map settings ── */}
          <Section title="Map Settings">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Map Title">
                <input
                  type="text"
                  value={mapTitle}
                  onChange={(e) => handleMapTitleChange(e.target.value)}
                  placeholder={
                    businessName && city
                      ? `${businessName} ${city}`
                      : "e.g. My Quality Construction Sterling Heights"
                  }
                  className={inputCls}
                />
              </Field>
              <Field
                label="Number of Pins"
                hint="Default is 50. Reduce for smaller cities."
              >
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={pinCount}
                  onChange={(e) => setPinCount(parseInt(e.target.value) || 50)}
                  className={inputCls}
                />
              </Field>
              <Field
                label="Random Seed (optional)"
                hint="Set a number to get reproducible pin layouts."
              >
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="leave blank for random"
                  className={inputCls}
                />
              </Field>
            </div>
          </Section>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <svg
                  className="animate-spin w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Generating map — this may take 15–30 seconds…
              </span>
            ) : (
              "Generate Map"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white";

const chipBtnCls =
  "px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition whitespace-nowrap";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {children}
    </div>
  );
}

// item 5: Field now accepts an optional error message and a ref for scroll-to.
function Field({
  label,
  hint,
  required,
  error,
  fieldRef,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  fieldRef?: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  return (
    <div ref={fieldRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {/* item 5: inline validation error */}
      {error && (
        <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>
      )}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function ChipList({
  items,
  onRemove,
  color,
}: {
  items: string[];
  onRemove: (item: string) => void;
  color: "indigo" | "emerald";
}) {
  if (items.length === 0) return null;

  const colorCls =
    color === "indigo"
      ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
      : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";

  return (
    <div className="flex flex-wrap gap-2 mt-2.5">
      {items.map((item) => (
        <span
          key={item}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${colorCls} transition`}
        >
          {item}
          <button
            type="button"
            onClick={() => onRemove(item)}
            className="opacity-60 hover:opacity-100 transition"
            aria-label={`Remove ${item}`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </span>
      ))}
    </div>
  );
}
