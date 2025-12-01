"use client";

import { useEffect, useMemo, useState } from "react";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const START_HOUR = 5;
const END_HOUR = 22;
const SLOT_INTERVAL_MINUTES = 30;

type Intensity = "Light" | "Moderate" | "Intense";

type WorkoutSession = {
  id: string;
  title: string;
  focus: string;
  day: string;
  start: string;
  duration: number;
  intensity: Intensity;
  notes?: string;
};

type SessionDraft = {
  title: string;
  focus: string;
  day: string;
  start: string;
  duration: number;
  intensity: Intensity;
  notes: string;
};

type Template = {
  id: string;
  label: string;
  title: string;
  focus: string;
  duration: number;
  intensity: Intensity;
  notes: string;
  benefits: string[];
};

const STORAGE_KEY = "gym-scheduler:sessions";

const TEMPLATES: Template[] = [
  {
    id: "hypertrophy-upper",
    label: "Upper Body Builder",
    title: "Upper Push/Pull",
    focus: "Hypertrophy & Strength",
    duration: 75,
    intensity: "Intense",
    notes:
      "Bench, row, overhead press, pull-ups, finish with accessory supersets.",
    benefits: [
      "Balanced push/pull volume",
      "Builds pressing strength",
      "Targets posture muscles",
    ],
  },
  {
    id: "lower-athlete",
    label: "Athletic Lower",
    title: "Lower Athletic Power",
    focus: "Power & Strength",
    duration: 70,
    intensity: "Intense",
    notes: "Trap-bar deadlift, front squat, unilateral work, sled pushes.",
    benefits: [
      "Explosive lower body power",
      "Posterior chain focus",
      "Improves sprint & jump ability",
    ],
  },
  {
    id: "engine",
    label: "Engine Builder",
    title: "Conditioning Circuit",
    focus: "Aerobic Capacity",
    duration: 45,
    intensity: "Moderate",
    notes: "Row, assault bike, kettlebell swings, core finisher.",
    benefits: [
      "Builds aerobic base",
      "Promotes recovery",
      "Supports fat loss goals",
    ],
  },
  {
    id: "recovery",
    label: "Mobility Recharge",
    title: "Mobility + Recovery",
    focus: "Mobility & Restoration",
    duration: 40,
    intensity: "Light",
    notes: "PRI resets, hip flow, thoracic work, guided breathing.",
    benefits: [
      "Improves movement quality",
      "Reduces soreness",
      "Enhances nervous system recovery",
    ],
  },
  {
    id: "sprint",
    label: "Speed Session",
    title: "Speed & Agility",
    focus: "Speed Mechanics",
    duration: 50,
    intensity: "Intense",
    notes: "Acceleration drills, wicket runs, change of direction work.",
    benefits: [
      "Sharpens acceleration",
      "Reinforces efficient mechanics",
      "Great for field sport athletes",
    ],
  },
];

const intensityBadgeStyles: Record<Intensity, string> = {
  Light:
    "border-emerald-500/50 bg-emerald-500/10 text-emerald-200 dark:text-emerald-100",
  Moderate:
    "border-amber-400/50 bg-amber-400/10 text-amber-200 dark:text-amber-100",
  Intense:
    "border-rose-500/60 bg-rose-500/10 text-rose-200 dark:text-rose-100",
};

const intensityDotStyles: Record<Intensity, string> = {
  Light: "bg-emerald-400",
  Moderate: "bg-amber-400",
  Intense: "bg-rose-500",
};

const intensityCopy: Record<Intensity, string> = {
  Light: "Restorative / Technique",
  Moderate: "Quality Work",
  Intense: "PR Hunt",
};

const defaultDraft = (): SessionDraft => ({
  title: "",
  focus: "",
  day: DAYS[0],
  start: "06:00",
  duration: 60,
  intensity: "Moderate",
  notes: "",
});

const buildTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_INTERVAL_MINUTES) {
      const hourLabel = hour.toString().padStart(2, "0");
      const minuteLabel = minute.toString().padStart(2, "0");
      slots.push(`${hourLabel}:${minuteLabel}`);
    }
  }
  return slots;
};

const timeSlots = buildTimeSlots();

const computeEndTime = (start: string, duration: number) => {
  const [hour, minute] = start.split(":").map(Number);
  const totalMinutes = hour * 60 + minute + duration;
  const endHour = Math.floor(totalMinutes / 60);
  const endMinute = totalMinutes % 60;
  return `${endHour.toString().padStart(2, "0")}:${endMinute
    .toString()
    .padStart(2, "0")}`;
};

const summaryByDay = (sessions: WorkoutSession[]) => {
  return DAYS.map((day) => {
    const daySessions = sessions.filter((session) => session.day === day);
    const totalMinutes = daySessions.reduce(
      (sum, session) => sum + session.duration,
      0
    );
    return { day, totalMinutes, count: daySessions.length };
  });
};

const intensityBreakdown = (sessions: WorkoutSession[]) => {
  return sessions.reduce<Record<Intensity, number>>(
    (acc, session) => {
      acc[session.intensity] += 1;
      return acc;
    },
    {
      Light: 0,
      Moderate: 0,
      Intense: 0,
    }
  );
};

const nextStartSuggestion = (
  sessions: WorkoutSession[],
  day: string
): string => {
  const taken = sessions
    .filter((session) => session.day === day)
    .map((session) => session.start);
  const firstFreeSlot =
    timeSlots.find((slot) => !taken.includes(slot)) ?? timeSlots[0];
  return firstFreeSlot;
};

export function GymScheduler() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [draft, setDraft] = useState<SessionDraft>(defaultDraft());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as WorkoutSession[];
        setSessions(parsed);
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const totalMinutes = useMemo(
    () => sessions.reduce((sum, session) => sum + session.duration, 0),
    [sessions]
  );

  const selectedTemplate = useMemo(
    () => TEMPLATES.find((template) => template.id === selectedTemplateId),
    [selectedTemplateId]
  );

  const handleSubmit = () => {
    const trimmedTitle = draft.title.trim();
    const trimmedFocus = draft.focus.trim();
    if (!trimmedTitle || !trimmedFocus) {
      return;
    }
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`;
    const newSession: WorkoutSession = {
      id,
      title: trimmedTitle,
      focus: trimmedFocus,
      day: draft.day,
      start: draft.start,
      duration: draft.duration,
      intensity: draft.intensity,
      notes: draft.notes.trim(),
    };
    setSessions((prev) =>
      [...prev, newSession].sort((a, b) => {
        const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return a.start.localeCompare(b.start);
      })
    );
    setDraft((prev) => ({
      ...defaultDraft(),
      day: prev.day,
      start: nextStartSuggestion([...sessions, newSession], prev.day),
    }));
  };

  const resetDraft = () => {
    setDraft(defaultDraft());
    setSelectedTemplateId(null);
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplateId(template.id);
    setDraft((prev) => ({
      ...prev,
      title: template.title,
      focus: template.focus,
      duration: template.duration,
      intensity: template.intensity,
      notes: template.notes,
    }));
  };

  const handleInputChange = <Key extends keyof SessionDraft>(
    key: Key,
    value: SessionDraft[Key]
  ) => {
    setDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (key !== "notes") {
      setSelectedTemplateId(null);
    }
  };

  const removeSession = (id: string) => {
    setSessions((prev) => prev.filter((session) => session.id !== id));
  };

  const duplicateSession = (id: string) => {
    const target = sessions.find((session) => session.id === id);
    if (!target) return;
    const nextStart = nextStartSuggestion(sessions, target.day);
    const clone: WorkoutSession = {
      ...target,
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}`,
      start: nextStart,
    };
    setSessions((prev) =>
      [...prev, clone].sort((a, b) => {
        const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return a.start.localeCompare(b.start);
      })
    );
  };

  const clearAll = () => {
    setSessions([]);
  };

  const summary = useMemo(() => summaryByDay(sessions), [sessions]);
  const breakdown = useMemo(() => intensityBreakdown(sessions), [sessions]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_#1e293b_0%,_transparent_55%)] opacity-80" />
        <main className="relative mx-auto max-w-6xl px-6 py-14 md:px-8 md:py-20 space-y-10">
          <header className="space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/80 px-4 py-1 text-sm font-medium text-slate-200/80 shadow-lg shadow-black/20">
              <span className="inline-flex size-2.5 rounded-full bg-emerald-400" />
              Dialed-In Gym Scheduler
            </div>
            <h1 className="font-[family-name:var(--font-geist-sans)] text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Build a smarter training week that matches your goals
            </h1>
            <p className="mx-auto max-w-3xl text-lg text-slate-300 md:text-xl">
              Stack your strength work, conditioning, and recovery days with a
              layout designed for busy athletes. Lock in sessions that respect
              intensity waves, track weekly volume, and keep your coaching notes
              tight.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 md:justify-start">
              <div className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-left shadow-lg shadow-black/25">
                <div className="text-3xl font-bold text-white">
                  {(totalMinutes / 60).toFixed(1)}
                </div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Hours Programmed
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-left shadow-lg shadow-black/25">
                <div className="text-3xl font-bold text-white">
                  {sessions.length}
                </div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Sessions Locked
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-left shadow-lg shadow-black/25">
                <div className="flex flex-col gap-1">
                  {Object.entries(breakdown).map(([level, count]) => (
                    <div
                      key={level}
                      className="flex items-center gap-2 text-xs text-slate-300"
                    >
                      <span
                        className={`inline-flex size-2 rounded-full ${intensityDotStyles[level as Intensity]}`}
                      />
                      <span>{level}</span>
                      <span className="text-slate-500">({count})</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Intensity Mix
                </div>
              </div>
            </div>
          </header>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <SchedulerBoard
                sessions={sessions}
                onRemove={removeSession}
                onDuplicate={duplicateSession}
              />
              <WeeklyOverview summary={summary} />
            </div>
            <aside className="space-y-6">
              <TemplatePanel
                templates={TEMPLATES}
                selectedTemplateId={selectedTemplateId}
                onSelect={handleTemplateSelect}
              />
              <SessionForm
                draft={draft}
                onChange={handleInputChange}
                onSubmit={handleSubmit}
                onReset={resetDraft}
                selectedTemplate={selectedTemplate}
                onPresetDay={(day) => {
                  handleInputChange("day", day);
                  handleInputChange(
                    "start",
                    nextStartSuggestion(sessions, day)
                  );
                }}
              />
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-5 shadow-xl shadow-black/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                    Reset Planner
                  </h3>
                  <button
                    onClick={clearAll}
                    className="rounded-full border border-rose-500/50 bg-rose-500/10 px-4 py-1 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
                  >
                    Clear Week
                  </button>
                </div>
                <p className="mt-3 text-sm text-slate-400">
                  Wipe your current schedule and rebuild from scratch. Saved
                  templates stay ready.
                </p>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}

function SchedulerBoard({
  sessions,
  onRemove,
  onDuplicate,
}: {
  sessions: WorkoutSession[];
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="border-b border-slate-800 bg-slate-900/70 px-6 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="font-[family-name:var(--font-geist-sans)] text-xl font-semibold text-white">
            Weekly Training Map
          </h2>
          <p className="text-sm text-slate-400">
            Align strength, conditioning, and recovery with an intensity wave.
          </p>
        </div>
      </div>
      <div className="relative">
        <div className="grid min-w-[720px] grid-cols-[120px_repeat(7,_1fr)] border-t border-slate-800 text-xs text-slate-400">
          <div className="sticky left-0 top-0 z-20 h-12 border-r border-slate-800 bg-slate-950 px-3 py-2 font-semibold uppercase tracking-wide text-slate-300">
            Time
          </div>
          {DAYS.map((day) => (
            <div
              key={day}
              className="flex h-12 items-center justify-center border-r border-slate-800 bg-slate-950/70 text-center font-medium uppercase tracking-wide text-white/80"
            >
              {day.slice(0, 3)}
            </div>
          ))}
          {timeSlots.map((slot, index) => (
            <TimeRow
              key={slot}
              slot={slot}
              sessions={sessions}
              onRemove={onRemove}
              onDuplicate={onDuplicate}
              showDivider={index % 2 === 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TimeRow({
  slot,
  sessions,
  onRemove,
  onDuplicate,
  showDivider,
}: {
  slot: string;
  sessions: WorkoutSession[];
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  showDivider: boolean;
}) {
  const rowSessions = DAYS.map((day) =>
    sessions.filter((session) => session.day === day && session.start === slot)
  );

  return (
    <>
      <div
        className={`sticky left-0 z-10 h-16 border-r border-slate-800 bg-slate-950 px-3 py-4 font-semibold text-slate-300 ${showDivider ? "border-t border-slate-800" : ""}`}
      >
        {slot}
      </div>
      {rowSessions.map((daySessions, index) => (
        <div
          key={`${slot}-${DAYS[index]}`}
          className={`h-16 border-r border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950/90 to-slate-900/80 px-2 py-2 ${showDivider ? "border-t border-slate-800/80" : ""}`}
        >
          <div className="flex h-full flex-col gap-1">
            {daySessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onRemove={onRemove}
                onDuplicate={onDuplicate}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function SessionCard({
  session,
  onRemove,
  onDuplicate,
}: {
  session: WorkoutSession;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  return (
    <div
      className={`group flex w-full flex-col gap-1 rounded-lg border ${intensityBadgeStyles[session.intensity]} px-3 py-2 text-xs transition`}
    >
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-300">
        <span className="font-semibold text-white/90">{session.title}</span>
        <span className="text-slate-400">
          {session.start} - {computeEndTime(session.start, session.duration)}
        </span>
      </div>
      <p className="text-[11px] text-slate-300">{session.focus}</p>
      {session.notes ? (
        <p className="text-[11px] text-slate-400">{session.notes}</p>
      ) : null}
      <div className="mt-1 hidden items-center justify-end gap-2 text-[10px] opacity-0 transition group-hover:flex group-hover:opacity-100">
        <button
          onClick={() => onDuplicate(session.id)}
          className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-medium text-white/70 hover:bg-white/10"
        >
          Clone
        </button>
        <button
          onClick={() => onRemove(session.id)}
          className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 font-medium text-rose-200 hover:bg-rose-500/20"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function WeeklyOverview({
  summary,
}: {
  summary: { day: string; totalMinutes: number; count: number }[];
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-100">
          Daily Volume Snapshot
        </h3>
        <span className="text-xs uppercase tracking-wide text-slate-400">
          Total minutes programmed
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {summary.map(({ day, totalMinutes, count }) => (
          <div
            key={day}
            className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">{day}</div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">
                  {count} session{count === 1 ? "" : "s"}
                </div>
              </div>
              <div className="text-2xl font-semibold text-emerald-300">
                {totalMinutes}
              </div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400"
                style={{
                  width: `${Math.min(100, (totalMinutes / 120) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplatePanel({
  templates,
  selectedTemplateId,
  onSelect,
}: {
  templates: Template[];
  selectedTemplateId: string | null;
  onSelect: (template: Template) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Tactical Sessions</h3>
        <span className="text-xs uppercase tracking-wide text-slate-400">
          Plug-and-play blueprints
        </span>
      </div>
      <div className="mt-4 grid gap-4">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className={`group rounded-2xl border px-4 py-4 text-left transition hover:border-emerald-400/40 hover:bg-emerald-400/10 ${selectedTemplateId === template.id ? "border-emerald-400/40 bg-emerald-400/10 shadow-lg shadow-emerald-500/20" : "border-slate-800 bg-slate-950/60"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">
                  {template.label}
                </div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  {template.duration} min · {template.intensity}
                </div>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-wide ${intensityBadgeStyles[template.intensity]}`}
              >
                {intensityCopy[template.intensity]}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-300">{template.notes}</p>
            <ul className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
              {template.benefits.map((benefit) => (
                <li
                  key={benefit}
                  className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1"
                >
                  {benefit}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}

function SessionForm({
  draft,
  onChange,
  onSubmit,
  onReset,
  selectedTemplate,
  onPresetDay,
}: {
  draft: SessionDraft;
  onChange: <Key extends keyof SessionDraft>(
    key: Key,
    value: SessionDraft[Key]
  ) => void;
  onSubmit: () => void;
  onReset: () => void;
  selectedTemplate: Template | undefined;
  onPresetDay: (day: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Session Builder</h3>
        <button
          onClick={onReset}
          className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
        >
          Reset
        </button>
      </div>
      {selectedTemplate ? (
        <div className="mt-3 rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-4 text-xs text-emerald-100">
          Locked from <span className="font-semibold">{selectedTemplate.label}</span>. Adjust anything before saving.
        </div>
      ) : null}
      <div className="mt-4 grid gap-4">
        <label className="grid gap-2 text-sm text-slate-300">
          <span>Headline</span>
          <input
            value={draft.title}
            onChange={(event) => onChange("title", event.target.value)}
            placeholder="e.g. Heavy Upper or Zone 2 Engine"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
          />
        </label>
        <label className="grid gap-2 text-sm text-slate-300">
          <span>Primary Focus</span>
          <input
            value={draft.focus}
            onChange={(event) => onChange("focus", event.target.value)}
            placeholder="Strength · Speed · Conditioning"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-300">
            <span>Day</span>
            <select
              value={draft.day}
              onChange={(event) => onPresetDay(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
            >
              {DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            <span>Start Time</span>
            <select
              value={draft.start}
              onChange={(event) => onChange("start", event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
            >
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-300">
            <span>Duration</span>
            <select
              value={draft.duration}
              onChange={(event) => onChange("duration", Number(event.target.value))}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
            >
              {[30, 45, 60, 75, 90, 105].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} min
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            <span>Intensity</span>
            <select
              value={draft.intensity}
              onChange={(event) =>
                onChange("intensity", event.target.value as Intensity)
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
            >
              {(["Light", "Moderate", "Intense"] as Intensity[]).map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="grid gap-2 text-sm text-slate-300">
          <span>Coaching Notes</span>
          <textarea
            value={draft.notes}
            onChange={(event) => onChange("notes", event.target.value)}
            rows={4}
            placeholder="Primer: band pull-aparts · Main lift: 5x3 @ 85% · Finisher: weighted carries"
            className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
          />
        </label>
        <button
          onClick={onSubmit}
          className="mt-2 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:from-emerald-400 hover:via-emerald-300 hover:to-teal-300"
        >
          Lock Session
        </button>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-[11px] text-slate-400">
          Build in {intensityCopy[draft.intensity].toLowerCase()} days between
          hard sessions. Rotate training stresses and keep Sunday open for
          assessment or full recovery.
        </div>
      </div>
    </div>
  );
}
