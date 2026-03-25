"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { AP_PRECALC_UNIT1_TOPICS } from "@/data/apPrecalcUnit1Topics";
import { buildApPrecalc11Session, AP_PRECALC_11_TITLE } from "@/data/apPrecalc11Session";
import ExponentialGraphSvg from "@/components/study/ExponentialGraphSvg";
import SixPointsCurveSvg from "@/components/study/apPrecalc11/SixPointsCurveSvg";
import ParabolaVertexGraphSvg from "@/components/study/apPrecalc11/ParabolaVertexGraphSvg";
import {
  replaceInfWithInfinitySymbol,
  validateIntervalSpec,
} from "@/utils/mathIntervalAnswer";
import MathText from "@/components/MathText";
import MixedMathLine from "@/components/study/MixedMathLine";
import {
  loadStudyWeakness,
  recordStudyMiss,
  recordStudyTopicMiss,
  getTopWeakTagKeys,
  getTopWeakTopicKeys,
  emptyStudyWeakness,
} from "@/utils/studyWeakness";
import {
  normalizeStudyTopicKey,
  shouldSkipTopicWeaknessKey,
} from "@/utils/studyTopicKey";
import { normalizeSkillTag } from "@/utils/studyTags";
import { recordStudyQuestionResult, mergeStudyStatsTime } from "@/utils/studyStatsFirestore";
import { auth } from "@/firebase";
import { DEMO_STUDY_QUIZ } from "@/data/studyDemoQuiz";

const MAX_CHARS = 120_000;

/**
 * Questions per AI request (session continues until user ends it).
 * Pricing tradeoff (Gemini 2.5 Flash, paid): output ~$2.50/M tokens vs input ~$0.30/M
 * (see https://ai.google.dev/gemini-api/docs/pricing). We resend notes every call, so
 * longer notes → larger batches amortize expensive repeated input; short notes → output
 * dominates → smaller batches limit first-load latency without much extra cost.
 */
function getSessionBatchSize(notesCharLength) {
  const n = Math.max(0, Number(notesCharLength) || 0);
  if (n < 4_000) return 4;
  if (n < 18_000) return 5;
  if (n < 45_000) return 7;
  if (n < 85_000) return 9;
  return 10;
}

function optionLetter(index) {
  return String.fromCharCode(65 + index);
}

/** Avoid "2. 2. ..." when the model also prefixes the question with a number */
function stripLeadingQuestionNumber(text) {
  if (typeof text !== "string") return text;
  return text.replace(/^\s*\d+[\.\)]\s*/, "").trim();
}

/**
 * Build coverage hints for next generation batch:
 * - focusTopics: least-covered topics so far (prefer topics less repeated in the recent tail)
 * - avoidTopics: over-covered vs min + recent tail — never overlaps focus (same key in both confuses the model)
 */
function buildTopicCoverageHints(topicCounts, recentTopics) {
  const entries = Object.entries(topicCounts || {}).filter(([, c]) => Number.isFinite(c) && c > 0);
  if (entries.length === 0) {
    return { focusTopics: [], avoidTopics: [] };
  }
  const min = Math.min(...entries.map(([, c]) => c));
  const max = Math.max(...entries.map(([, c]) => c));
  const atMin = entries.filter(([, c]) => c === min).map(([k]) => k);
  const overRep = max > min ? entries.filter(([, c]) => c === max).map(([k]) => k) : [];

  const recent = Array.isArray(recentTopics) ? recentTopics.slice(-6) : [];
  const recentUnique = [...new Set(recent)];

  // Order focus: among min-count topics, prefer those appearing less in the recent tail (rotation)
  const recentTail = recent.slice(-4);
  const recentTailHits = (k) => recentTail.filter((t) => t === k).length;
  const focusTopics = [...atMin]
    .sort((a, b) => recentTailHits(a) - recentTailHits(b))
    .slice(0, 8);

  // Avoid: truly over-represented (only when max > min) + recent variety
  let avoidTopics = [...new Set([...overRep, ...recentUnique])].slice(0, 8);

  // Same topic must not appear in PRIORITIZE and AVOID (e.g. when all counts are tied, "recent" used to duplicate all min topics)
  const focusSet = new Set(focusTopics);
  avoidTopics = avoidTopics.filter((k) => !focusSet.has(k));

  return { focusTopics, avoidTopics };
}

export default function StudyQuiz({ user }) {
  const [notes, setNotes] = useState("");
  /** @type {"history" | "science" | "math"} */
  const [subject, setSubject] = useState("history");
  /** AP Precalc Unit 1 section id, e.g. "1.3" */
  const [mathTopicId, setMathTopicId] = useState("1.1");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [quiz, setQuiz] = useState(null);
  /** Programmatic math: topic id when practice is active (no AI) */
  const [pmTopic, setPmTopic] = useState(null);
  const [pmPhase, setPmPhase] = useState("playing");
  /** Programmatic 1.1 question list (MCQ + interval) */
  const [pmSession, setPmSession] = useState(null);
  const [pmIndex, setPmIndex] = useState(0);
  /** @type {Record<number, number | null>} */
  const [pmMcqSelections, setPmMcqSelections] = useState({});
  /** @type {Record<number, boolean>} */
  const [pmChecked, setPmChecked] = useState({});
  /** @type {Record<number, boolean>} */
  const [pmWasCorrect, setPmWasCorrect] = useState({});
  /** User tapped "I'm stuck" (math) — reveal answer, count as skipped */
  const [pmStuckSteps, setPmStuckSteps] = useState({});
  const [pmIntervalAnswer, setPmIntervalAnswer] = useState("");

  /** Local-only preview: no Gemini, no Firestore stats */
  const [isDemoSession, setIsDemoSession] = useState(false);
  const isDemoSessionRef = useRef(false);
  /** @type {Record<number, number | null>} questionIndex -> selected option index */
  const [selections, setSelections] = useState({});
  /** Whether user pressed "Check" or "I'm stuck" on that question (shows explanation) */
  const [checkedSteps, setCheckedSteps] = useState({});
  /** AI quiz: revealed via I'm stuck (counts as skipped in stats) */
  const [stuckSteps, setStuckSteps] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  /** 'playing' = one question at a time; 'results' = final score */
  const [quizPhase, setQuizPhase] = useState("playing");
  /** Miss counts per skill tag (Firestore + local); drives adaptive generation */
  const [studyWeakness, setStudyWeakness] = useState(emptyStudyWeakness);
  /** Topic coverage balancing for this session (AI-only) */
  const [topicCounts, setTopicCounts] = useState({});
  const [recentTopics, setRecentTopics] = useState([]);
  /** Wall-clock start for current study session (AI or math) — flushed to Firestore on exit */
  const studySessionStartRef = useRef(null);
  /** Latest quiz for goNext after async prefetch (state may not have committed yet) */
  const quizRef = useRef(null);
  /** In-flight background fetch for the next batch (continuous practice) */
  const prefetchPromiseRef = useRef(null);
  const prefetchInFlightRef = useRef(false);

  /** Larger notes → larger batches (fewer API calls; same notes re-sent each call). See getSessionBatchSize. */
  const sessionBatchSize = useMemo(
    () => getSessionBatchSize(notes.length),
    [notes.length]
  );

  useEffect(() => {
    quizRef.current = quiz;
  }, [quiz]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const w = await loadStudyWeakness(user);
      if (!cancelled) setStudyWeakness(w);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const flushSessionTime = useCallback(() => {
    if (isDemoSession) {
      studySessionStartRef.current = null;
      return;
    }
    if (!user || !studySessionStartRef.current) return;
    const seconds = Math.floor((Date.now() - studySessionStartRef.current) / 1000);
    if (seconds > 0) void mergeStudyStatsTime(user, seconds);
    studySessionStartRef.current = null;
  }, [user, isDemoSession]);

  useEffect(() => {
    isDemoSessionRef.current = isDemoSession;
  }, [isDemoSession]);

  /** Start timer when a study session becomes active */
  useEffect(() => {
    const active = Boolean(quiz) || Boolean(pmTopic);
    if (active && !studySessionStartRef.current) {
      studySessionStartRef.current = Date.now();
    }
  }, [quiz, pmTopic]);

  /** Save time when leaving the page mid-session (use auth.currentUser so logout still flushes) */
  useEffect(() => {
    return () => {
      if (!studySessionStartRef.current) return;
      const seconds = Math.floor((Date.now() - studySessionStartRef.current) / 1000);
      const u = auth?.currentUser;
      if (seconds > 0 && u && !isDemoSessionRef.current) void mergeStudyStatsTime(u, seconds);
      studySessionStartRef.current = null;
    };
  }, []);

  const resetQuiz = useCallback(() => {
    flushSessionTime();
    setQuiz(null);
    setSelections({});
    setCheckedSteps({});
    setStuckSteps({});
    setTopicCounts({});
    setRecentTopics([]);
    setCurrentIndex(0);
    setQuizPhase("playing");
    setPmTopic(null);
    setPmPhase("playing");
    setPmSession(null);
    setPmIndex(0);
    setPmMcqSelections({});
    setPmChecked({});
    setPmWasCorrect({});
    setPmStuckSteps({});
    setPmIntervalAnswer("");
    setError(null);
    setLoadingMore(false);
    setIsDemoSession(false);
  }, [flushSessionTime]);

  useEffect(() => {
    setPmIntervalAnswer("");
  }, [pmIndex, pmTopic]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt") && file.type && !file.type.includes("text")) {
      setError("Please upload a .txt file (or paste notes below).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setNotes(text.slice(0, MAX_CHARS));
      setError(null);
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(file);
    e.target.value = "";
  };

  /** Programmatic math — topic 1.1 only for now */
  const startMathPractice = () => {
    setError(null);
    if (mathTopicId === "1.1") {
      setPmTopic("1.1");
      setPmPhase("playing");
      setPmSession(buildApPrecalc11Session());
      setPmIndex(0);
      setPmMcqSelections({});
      setPmChecked({});
      setPmWasCorrect({});
      setPmStuckSteps({});
      setPmIntervalAnswer("");
      return;
    }
    setError("Practice for this topic is coming soon. Try 1.1 — Change in Tandem for now.");
  };

  const checkPrecalc11Current = () => {
    if (!pmSession?.length) return;
    const q = pmSession[pmIndex];
    if (q.type === "mcq") {
      const sel = pmMcqSelections[pmIndex];
      if (sel === undefined || sel === null) return;
      const ok = sel === q.correctIndex;
      setPmWasCorrect((prev) => ({ ...prev, [pmIndex]: ok }));
      setPmChecked((prev) => ({ ...prev, [pmIndex]: true }));
      void recordStudyQuestionResult(user, ok ? "correct" : "wrong");
      return;
    }
    const raw = pmIntervalAnswer.trim();
    if (!raw) return;
    const ok = validateIntervalSpec(raw, q.intervalSpec);
    setPmWasCorrect((prev) => ({ ...prev, [pmIndex]: ok }));
    setPmChecked((prev) => ({ ...prev, [pmIndex]: true }));
    void recordStudyQuestionResult(user, ok ? "correct" : "wrong");
  };

  const imStuckPrecalc = () => {
    if (!pmSession?.length || pmChecked[pmIndex]) return;
    setPmStuckSteps((prev) => ({ ...prev, [pmIndex]: true }));
    setPmChecked((prev) => ({ ...prev, [pmIndex]: true }));
    void recordStudyQuestionResult(user, "skipped");
  };

  const goPrecalc11Next = () => {
    if (!pmSession?.length) return;
    if (pmIndex < pmSession.length - 1) {
      setPmIndex((i) => i + 1);
      return;
    }
    setPmPhase("results");
  };

  const selectPrecalc11Mcq = (optionIndex) => {
    if (pmChecked[pmIndex]) return;
    setPmMcqSelections((prev) => ({ ...prev, [pmIndex]: optionIndex }));
  };

  const fetchQuestionBatch = useCallback(async () => {
    if (!notes.trim() || subject === "math") return null;
    const idToken = await user.getIdToken();
    const res = await fetch("/api/study/generate-quiz", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        notes: notes.trim(),
        numQuestions: sessionBatchSize,
        subject,
        weakTags: getTopWeakTagKeys(studyWeakness, subject),
        weakTopics: getTopWeakTopicKeys(studyWeakness, subject),
        topicCoverage: buildTopicCoverageHints(topicCounts, recentTopics),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    if (!data.quiz?.questions?.length) {
      throw new Error("No questions returned. Try again.");
    }
    return data.quiz;
  }, [user, notes, subject, studyWeakness, topicCounts, recentTopics, sessionBatchSize]);

  /**
   * Prefetch the next batch in the background before the current buffer runs out.
   * Threshold scales with batch size (~half the batch remaining).
   */
  useEffect(() => {
    if (!quiz?.questions?.length || quizPhase !== "playing") return;
    if (isDemoSession) return;
    if (subject === "math") return;
    if (!notes.trim()) return;
    const remaining = quiz.questions.length - currentIndex;
    const prefetchThreshold = Math.max(2, Math.ceil(sessionBatchSize / 2));
    if (remaining > prefetchThreshold) return;
    if (prefetchInFlightRef.current) return;

    prefetchInFlightRef.current = true;
    const run = (async () => {
      try {
        const batch = await fetchQuestionBatch();
        if (batch?.questions?.length) {
          setQuiz((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              questions: [...prev.questions, ...batch.questions],
            };
          });
        }
      } catch (e) {
        console.error("Prefetch batch:", e);
      } finally {
        prefetchInFlightRef.current = false;
        prefetchPromiseRef.current = null;
      }
    })();
    prefetchPromiseRef.current = run;
  }, [quiz, currentIndex, quizPhase, subject, notes, fetchQuestionBatch, sessionBatchSize, isDemoSession]);

  const generate = async () => {
    if (subject === "math") return;
    if (!notes.trim()) {
      setError("Paste your notes or upload a .txt file first.");
      return;
    }
    setError(null);
    setLoading(true);
    setQuiz(null);
    setSelections({});
    setCheckedSteps({});
    setStuckSteps({});
    setTopicCounts({});
    setRecentTopics([]);
    setCurrentIndex(0);
    setQuizPhase("playing");
    try {
      const batch = await fetchQuestionBatch();
      if (batch) setQuiz(batch);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreQuestions = async () => {
    if (!notes.trim() || subject === "math") return false;
    setLoadingMore(true);
    setError(null);
    try {
      const batch = await fetchQuestionBatch();
      if (!batch) return false;
      setQuiz((prev) => {
        if (!prev) return batch;
        return {
          ...prev,
          questions: [...prev.questions, ...batch.questions],
        };
      });
      return true;
    } catch (err) {
      console.error(err);
      setError(err?.message || "Network error. Try again.");
      return false;
    } finally {
      setLoadingMore(false);
    }
  };

  const endSession = () => {
    setQuizPhase("results");
  };

  const startDemoSession = () => {
    setError(null);
    setSubject("science");
    setIsDemoSession(true);
    setQuiz({
      title: DEMO_STUDY_QUIZ.title,
      questions: DEMO_STUDY_QUIZ.questions.map((q) => ({ ...q })),
    });
    setSelections({});
    setCheckedSteps({});
    setStuckSteps({});
    setTopicCounts({});
    setRecentTopics([]);
    setCurrentIndex(0);
    setQuizPhase("playing");
  };

  const goNext = async () => {
    if (!quiz?.questions?.length) return;
    const qi = currentIndex;
    const n = quiz.questions.length;
    if (qi < n - 1) {
      setCurrentIndex((i) => i + 1);
      return;
    }
    if (isDemoSession) {
      setQuizPhase("results");
      return;
    }
    // At end of buffer: next batch is usually already prefetched
    setLoadingMore(true);
    try {
      const pending = prefetchPromiseRef.current;
      if (pending) {
        await pending;
      }
      await new Promise((r) => setTimeout(r, 0));
      if (quizRef.current && quizRef.current.questions.length > qi + 1) {
        setCurrentIndex(qi + 1);
        return;
      }
      const ok = await fetchMoreQuestions();
      if (ok) setCurrentIndex(qi + 1);
    } finally {
      setLoadingMore(false);
    }
  };

  const selectOption = (qIndex, optionIndex) => {
    if (checkedSteps[qIndex]) return;
    setSelections((prev) => ({ ...prev, [qIndex]: optionIndex }));
  };

  const imStuckAI = () => {
    if (!quiz?.questions?.length) return;
    if (checkedSteps[currentIndex]) return;
    const q = quiz.questions[currentIndex];
    if (!isDemoSession) {
      const topic = normalizeStudyTopicKey(q.topicLabel);
      setTopicCounts((prev) => ({ ...prev, [topic]: (prev[topic] || 0) + 1 }));
      setRecentTopics((prev) => [...prev.slice(-5), topic]);
    }
    setStuckSteps((prev) => ({ ...prev, [currentIndex]: true }));
    setCheckedSteps((prev) => ({ ...prev, [currentIndex]: true }));
    if (!isDemoSession) void recordStudyQuestionResult(user, "skipped");
  };

  const checkCurrent = () => {
    if (!quiz?.questions?.length) return;
    if (selections[currentIndex] === undefined || selections[currentIndex] === null) return;
    const q = quiz.questions[currentIndex];
    if (!isDemoSession) {
      const topic = normalizeStudyTopicKey(q.topicLabel);
      setTopicCounts((prev) => ({ ...prev, [topic]: (prev[topic] || 0) + 1 }));
      setRecentTopics((prev) => [...prev.slice(-5), topic]);
    }
    const wrong = selections[currentIndex] !== q.correctIndex;
    setCheckedSteps((prev) => ({ ...prev, [currentIndex]: true }));
    if (!isDemoSession) {
      void recordStudyQuestionResult(user, wrong ? "wrong" : "correct");
      if (wrong && (subject === "history" || subject === "science")) {
        const tag = normalizeSkillTag(subject, q.skillTag);
        const topicKey = normalizeStudyTopicKey(q.topicLabel);
        setStudyWeakness((prev) => {
          const sub = subject === "science" ? "science" : "history";
          const tags = { ...(prev[sub]?.tags || {}) };
          tags[tag] = (tags[tag] || 0) + 1;
          const topics = { ...(prev[sub]?.topics || {}) };
          if (!shouldSkipTopicWeaknessKey(topicKey)) {
            topics[topicKey] = (topics[topicKey] || 0) + 1;
          }
          return { ...prev, [sub]: { ...prev[sub], tags, topics } };
        });
        void recordStudyMiss(user, subject, tag);
        void recordStudyTopicMiss(user, subject, q.topicLabel);
      }
    }
  };

  /** AI quiz: indices where user checked an answer or used I'm stuck (counts toward results + stats; untouched buffer questions excluded) */
  const aiAttemptedIndices =
    quiz && quizPhase === "results"
      ? quiz.questions.map((_, i) => i).filter((i) => checkedSteps[i])
      : [];
  const aiAttemptedCount = aiAttemptedIndices.length;

  const score =
    quiz && quizPhase === "results"
      ? quiz.questions.reduce((acc, q, i) => {
          if (!checkedSteps[i]) return acc;
          if (stuckSteps[i]) return acc;
          const sel = selections[i];
          return acc + (sel === q.correctIndex ? 1 : 0);
        }, 0)
      : 0;

  const skippedInSession =
    quiz && quizPhase === "results"
      ? quiz.questions.reduce((acc, _, i) => acc + (stuckSteps[i] ? 1 : 0), 0)
      : 0;

  const pmScore =
    pmTopic === "1.1" && pmPhase === "results" && pmSession?.length
      ? pmSession.reduce(
          (acc, _q, i) => acc + (!pmStuckSteps[i] && pmWasCorrect[i] === true ? 1 : 0),
          0
        )
      : 0;
  const pmSkipped =
    pmTopic === "1.1" && pmPhase === "results" && pmSession?.length
      ? pmSession.reduce((acc, _q, i) => acc + (pmStuckSteps[i] ? 1 : 0), 0)
      : 0;
  const pmMax = pmSession?.length ?? 0;

  /** @param {{ type: string, visual?: { kind: string } }} q */
  const renderPrecalc11Figure = (q) => {
    if (!q?.visual) return null;
    const v = q.visual;
    if (v.kind === "piecewise" && v.points) {
      return <SixPointsCurveSvg points={v.points} className="w-full" />;
    }
    if (v.kind === "exp") {
      return (
        <ExponentialGraphSvg base={v.base} equationLatex={v.equationLatex} className="w-full" />
      );
    }
    if (v.kind === "parabola") {
      return (
        <ParabolaVertexGraphSvg
          className="w-full"
          h={v.h}
          k={v.a}
          k0={v.k0 ?? 0}
          opensUp={Boolean(v.opensUp)}
        />
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 w-full min-w-0 max-w-full">
      {!quiz && !pmTopic && (
        <div className="rounded-xl border border-border bg-background shadow-sm p-6 md:p-8 space-y-6">
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Choose a subject</p>
            <div className="grid grid-cols-2 gap-3 max-w-lg">
              {(
                [
                  { id: "math", label: "Math", hint: "AP Precalc · built-in" },
                  { id: "science", label: "Science", hint: "AI from your notes" },
                  { id: "history", label: "History", hint: "Social studies" },
                  { id: "soon", label: "Coming soon", hint: "More subjects", disabled: true },
                ]
              ).map((tile) => {
                const isSelected = !tile.disabled && subject === tile.id;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    disabled={tile.disabled}
                    onClick={() => {
                      if (tile.disabled) return;
                      if (tile.id === "science") setSubject("science");
                      else if (tile.id === "math") setSubject("math");
                      else setSubject("history");
                      setError(null);
                    }}
                    className={[
                      "rounded-xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      tile.disabled
                        ? "border-border bg-muted/20 text-muted-foreground cursor-not-allowed opacity-80"
                        : isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-background hover:bg-muted/40 hover:border-muted-foreground/30",
                    ].join(" ")}
                  >
                    <span
                      className={`block font-semibold ${tile.disabled ? "text-muted-foreground" : "text-foreground"}`}
                    >
                      {tile.label}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground leading-snug">{tile.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Try the flow without AI</p>
              <p className="text-xs text-muted-foreground">
                Three static questions — no Gemini, nothing saved to your stats.
              </p>
            </div>
            <button
              type="button"
              onClick={startDemoSession}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-border bg-background font-medium rounded-lg hover:bg-muted/60 transition-colors text-sm"
            >
              Start demo
            </button>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end gap-4 flex-wrap">
            {subject === "math" && (
              <div className="flex-1 min-w-[min(100%,18rem)]">
                <label htmlFor="study-math-topic" className="block text-sm font-medium text-foreground mb-1.5">
                  Topic (Unit 1)
                </label>
                <select
                  id="study-math-topic"
                  value={mathTopicId}
                  onChange={(e) => {
                    setMathTopicId(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  {AP_PRECALC_UNIT1_TOPICS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} {t.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Built-in practice (no AI). More topics coming soon.
                </p>
              </div>
            )}

            {subject === "math" ? (
              <button
                type="button"
                onClick={startMathPractice}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-foreground text-background font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Start practice
              </button>
            ) : (
              <button
                type="button"
                onClick={generate}
                disabled={loading || !notes.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-foreground text-background font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Starting session…" : "Start practice session"}
              </button>
            )}
          </div>

          {subject !== "math" && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Your notes</h2>
              <p className="text-sm text-muted-foreground mb-3">
                Paste text or upload a <strong>.txt</strong> file (up to ~10 pages). Notes are sent only to
                generate questions during your session.
              </p>
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value.slice(0, MAX_CHARS));
                  setError(null);
                }}
                rows={12}
                placeholder="Paste your class notes, outline, or study sheet here…"
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y font-mono text-sm"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs text-muted-foreground">
                <span>
                  {notes.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
                </span>
                <label className="cursor-pointer text-primary hover:underline font-medium">
                  Upload .txt
                  <input type="file" accept=".txt,text/plain" className="hidden" onChange={handleFile} />
                </label>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Programmatic math — AP Precalc 1.1 (Change in Tandem) */}
      {pmTopic === "1.1" && pmPhase === "playing" && pmSession?.length > 0 && (() => {
        const qi = pmIndex;
        const q = pmSession[qi];
        const total = pmSession.length;
        const revealed = !!pmChecked[qi];
        const selected = pmMcqSelections[qi];
        const figure = renderPrecalc11Figure(q);

        return (
          <div className="space-y-6 w-full min-w-0 max-w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-foreground">{AP_PRECALC_11_TITLE}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Question {qi + 1} of {total} — procedural math (new numbers each run). Intervals + piecewise slopes.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-muted-foreground tabular-nums px-3 py-1.5 rounded-full bg-muted/60 border border-border">
                  {qi + 1} / {total}
                </span>
                <button
                  type="button"
                  onClick={resetQuiz}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50"
                >
                  Exit
                </button>
              </div>
            </div>

            {figure && (
              <div className="rounded-xl border border-border bg-white dark:bg-background p-4 overflow-x-auto">
                {figure}
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/10 p-5 md:p-6 space-y-4 min-w-0 max-w-full">
              <div className="flex gap-2 sm:gap-3 min-w-0 text-foreground font-medium leading-relaxed">
                <span className="text-muted-foreground shrink-0 tabular-nums pt-0.5">{qi + 1}.</span>
                <div className="min-w-0 flex-1">
                  {q.type === "mcq" ? (
                    q.questionParts ? (
                      <MixedMathLine parts={q.questionParts} />
                    ) : q.questionLatex ? (
                      <MathText latex={q.questionLatex} />
                    ) : (
                      <span className="break-words">{q.question}</span>
                    )
                  ) : q.promptParts ? (
                    <MixedMathLine parts={q.promptParts} />
                  ) : q.promptLatex ? (
                    <MathText latex={q.promptLatex} />
                  ) : (
                    <span className="break-words">{q.prompt}</span>
                  )}
                </div>
              </div>

              {q.type === "mcq" && (
                <ul className="space-y-2 pl-0 md:pl-2">
                  {q.options.map((opt, oi) => {
                    const isSelected = selected === oi;
                    const isCorrectOption = oi === q.correctIndex;
                    let ring = "border-border";
                    if (revealed) {
                      if (isCorrectOption) ring = "border-green-500 bg-green-50 dark:bg-green-950/20";
                      else if (isSelected && !isCorrectOption)
                        ring = "border-red-400 bg-red-50 dark:bg-red-950/20";
                    } else if (isSelected) {
                      ring = "border-primary ring-1 ring-primary";
                    }
                    return (
                      <li key={oi}>
                        <button
                          type="button"
                          onClick={() => selectPrecalc11Mcq(oi)}
                          disabled={revealed}
                          className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${ring} ${
                            revealed ? "cursor-default" : "hover:bg-muted/40 cursor-pointer"
                          }`}
                        >
                          <span className="font-medium text-muted-foreground mr-2">
                            {String.fromCharCode(65 + oi)}.
                          </span>
                          {opt}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {q.type === "interval" && (
                <>
                  <label htmlFor={`math-interval-${qi}`} className="sr-only">
                    Interval answer
                  </label>
                  <input
                    id={`math-interval-${qi}`}
                    type="text"
                    value={pmIntervalAnswer}
                    onChange={(e) => {
                      const v = replaceInfWithInfinitySymbol(e.target.value);
                      setPmIntervalAnswer(v);
                    }}
                    disabled={revealed}
                    placeholder="e.g. (-infinity, infinity) or (-inf, 2)"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70"
                    autoComplete="off"
                  />
                </>
              )}

              {revealed && pmStuckSteps[qi] && (
                <p className="text-sm text-muted-foreground">
                  Answer shown — this counts as <strong>skipped</strong> in your stats.
                </p>
              )}
              {revealed && !pmStuckSteps[qi] && (
                <div
                  className={`text-sm min-w-0 max-w-full ${
                    pmWasCorrect[qi]
                      ? "text-green-700 dark:text-green-400"
                      : "text-amber-800 dark:text-amber-200"
                  }`}
                >
                  <span className="font-medium">{pmWasCorrect[qi] ? "Correct." : "Not quite."}</span>{" "}
                  {q.explanationParts ? (
                    <span className="text-muted-foreground">
                      <MixedMathLine parts={q.explanationParts} />
                    </span>
                  ) : q.explanationLatex ? (
                    <span className="text-muted-foreground">
                      <MathText latex={q.explanationLatex} />
                    </span>
                  ) : (
                    q.explanation && (
                      <span className="text-muted-foreground break-words">{q.explanation}</span>
                    )
                  )}
                </div>
              )}
              {revealed && pmStuckSteps[qi] && (
                <div className="text-sm text-muted-foreground min-w-0 max-w-full border-t border-border pt-3 mt-2">
                  {q.explanationParts ? (
                    <MixedMathLine parts={q.explanationParts} />
                  ) : q.explanationLatex ? (
                    <MathText latex={q.explanationLatex} />
                  ) : (
                    q.explanation && <span className="break-words">{q.explanation}</span>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mt-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (!revealed) checkPrecalc11Current();
                      else goPrecalc11Next();
                    }}
                    disabled={
                      !revealed &&
                      ((q.type === "mcq" && (selected === undefined || selected === null)) ||
                        (q.type === "interval" && !pmIntervalAnswer.trim()))
                    }
                    className="px-5 py-2.5 bg-foreground text-background font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!revealed ? "Check" : qi >= total - 1 ? "See results" : "Next"}
                  </button>
                  <button
                    type="button"
                    onClick={imStuckPrecalc}
                    disabled={revealed}
                    className="px-5 py-2.5 border border-border font-medium rounded-lg hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    I&apos;m stuck
                  </button>
                </div>
                {!revealed && q.type === "interval" && !pmIntervalAnswer.trim() && (
                  <p className="text-xs text-muted-foreground">Enter an interval to enable Check.</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {pmTopic === "1.1" && pmPhase === "results" && (
        <div className="rounded-xl border border-border bg-muted/10 p-8 md:p-10 text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Practice complete</h2>
          <p className="text-3xl font-semibold text-foreground tabular-nums">
            {pmScore} / {pmMax} correct
          </p>
          {pmSkipped > 0 && (
            <p className="text-sm text-muted-foreground">{pmSkipped} skipped (I&apos;m stuck)</p>
          )}
          <p className="text-muted-foreground text-sm">
            AP Precalc 1.1 — Change in Tandem (programmatic, no AI).
          </p>
          <button
            type="button"
            onClick={resetQuiz}
            className="mt-2 px-6 py-3 bg-foreground text-background font-medium rounded-lg hover:opacity-90"
          >
            Back to topics
          </button>
        </div>
      )}

      {quiz && quizPhase === "results" && (
        <div className="rounded-xl border border-border bg-muted/10 p-6 md:p-8 space-y-8 w-full min-w-0 max-w-full">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Session complete</h2>
            <p className="text-lg font-medium text-foreground">Show results</p>
            {aiAttemptedCount > 0 ? (
              <p className="text-3xl font-semibold text-foreground tabular-nums">
                {score} / {aiAttemptedCount} correct
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">No questions were completed in this session.</p>
            )}
            {skippedInSession > 0 && (
              <p className="text-sm text-muted-foreground">{skippedInSession} skipped (I&apos;m stuck)</p>
            )}
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {aiAttemptedCount > 0
                ? "Each completed question is listed below with your answer and the correct answer."
                : "Start a new session to practice again."}
            </p>
          </div>

          <div className="space-y-6 max-h-[min(70vh,800px)] overflow-y-auto pr-1">
            {aiAttemptedIndices.map((i) => {
              const q = quiz.questions[i];
              const sel = selections[i];
              const hasAnswer = sel !== undefined && sel !== null;
              const correct = hasAnswer && sel === q.correctIndex;
              const yourOpt = hasAnswer ? q.options[sel] : null;
              const correctOpt = q.options[q.correctIndex];
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-background p-4 md:p-5 text-left space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground tabular-nums">Q{i + 1}</span>
                    {stuckSteps[i] ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                        Skipped
                      </span>
                    ) : hasAnswer ? (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          correct
                            ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                            : "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                        }`}
                      >
                        {correct ? "Correct" : "Incorrect"}
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        No answer
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {stripLeadingQuestionNumber(q.question)}
                  </p>
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="font-medium text-foreground">Your answer: </span>
                      {stuckSteps[i] ? (
                        <span className="text-muted-foreground">Skipped (answer shown during session)</span>
                      ) : hasAnswer ? (
                        <span className="text-foreground">
                          <span className="font-mono font-medium">{optionLetter(sel)}.</span> {yourOpt}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Correct answer: </span>
                      <span className="text-foreground">
                        <span className="font-mono font-medium">{optionLetter(q.correctIndex)}.</span>{" "}
                        {correctOpt}
                      </span>
                    </div>
                  </div>
                  {q.explanation && (
                    <p className="text-xs text-muted-foreground border-t border-border pt-3">
                      <span className="font-medium text-foreground">Why: </span>
                      {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={resetQuiz}
              className="px-6 py-3 bg-foreground text-background font-medium rounded-lg hover:opacity-90"
            >
              New session
            </button>
          </div>
        </div>
      )}

      {quiz && quizPhase === "playing" && (() => {
        const qi = currentIndex;
        const q = quiz.questions[qi];
        const selected = selections[qi];
        const revealed = !!checkedSteps[qi];
        return (
          <div className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm">
                {error}
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{quiz.title}</h2>
                {isDemoSession && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                    Demo
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground tabular-nums px-3 py-1.5 rounded-full bg-muted/60 border border-border">
                  Question {qi + 1}
                </span>
                <button
                  type="button"
                  onClick={endSession}
                  className="px-4 py-2 border border-red-500/50 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/10"
                >
                  End session
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/10 p-5 md:p-6">
              <p className="text-foreground font-medium mb-4">
                <span className="text-muted-foreground mr-2 tabular-nums">{qi + 1}.</span>
                {stripLeadingQuestionNumber(q.question)}
              </p>
              <ul className="space-y-2 pl-0 md:pl-2">
                {q.options.map((opt, oi) => {
                  const isSelected = selected === oi;
                  const isCorrectOption = oi === q.correctIndex;
                  let ring = "border-border";
                  if (revealed) {
                    if (isCorrectOption) ring = "border-green-500 bg-green-50 dark:bg-green-950/20";
                    else if (isSelected && !isCorrectOption)
                      ring = "border-red-400 bg-red-50 dark:bg-red-950/20";
                  } else if (isSelected) {
                    ring = "border-primary ring-1 ring-primary";
                  }
                  return (
                    <li key={oi}>
                      <button
                        type="button"
                        onClick={() => selectOption(qi, oi)}
                        disabled={revealed}
                        className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${ring} ${
                          revealed ? "cursor-default" : "hover:bg-muted/40 cursor-pointer"
                        }`}
                      >
                        <span className="font-medium text-muted-foreground mr-2">
                          {optionLetter(oi)}.
                        </span>
                        {opt}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {revealed && q.explanation && (
                <p className="mt-4 text-sm text-muted-foreground border-t border-border pt-4">
                  <span className="font-medium text-foreground">Why: </span>
                  {q.explanation}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!revealed) checkCurrent();
                    else void goNext();
                  }}
                  disabled={
                    (!revealed && (selected === undefined || selected === null)) ||
                    (revealed && loadingMore)
                  }
                  className="px-5 py-2.5 bg-foreground text-background font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!revealed ? "Check" : loadingMore ? "Loading more…" : "Next question"}
                </button>
                <button
                  type="button"
                  onClick={imStuckAI}
                  disabled={revealed}
                  className="px-5 py-2.5 border border-border font-medium rounded-lg hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  I&apos;m stuck
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
