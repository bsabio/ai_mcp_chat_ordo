"use client";

import { useReducer, useRef, useEffect, useState, useCallback } from "react";
import { ToolCard } from "./ToolCard";
import { downloadFileFromUrl } from "../lib/download-browser";
import {
  createAudioElement,
  getUserScrollBehavior,
  scrollElementIntoView,
  supportsIntersectionObserver,
  supportsReadableStreamReader,
} from "@/lib/ui/browserSupport";
import {
  estimateAudioDurationSeconds,
  estimateAudioGenerationSeconds,
} from "@/lib/audio/audio-estimates";

interface AudioPlayerProps {
  title: string;
  text: string;
  /** If set, audio is already cached — skip TTS generation and serve from cache */
  assetId?: string;
  provider?: string;
  generationStatus?: string;
  estimatedDurationSeconds?: number;
  estimatedGenerationSeconds?: number;
  /** When true (e.g. restored from conversation history), don't auto-play */
  autoPlay?: boolean;
}

/* ── helpers ─────────────────────────────────────────────────────── */

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/* ── loading-stage hook ──────────────────────────────────────────── */

const LOADING_STAGES = [
  { label: "Connecting to speech engine…", delay: 0 },
  { label: "Generating speech…", delay: 2000 },
  { label: "Streaming audio…", delay: 6000 },
  { label: "Almost ready…", delay: 12000 },
];

function useLoadingStage(isLoading: boolean) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      return;
    }
    const start = Date.now();
    const tick = setInterval(() => {
      const ms = Date.now() - start;
      setElapsed(Math.floor(ms / 1000));
    }, 200);
    return () => clearInterval(tick);
  }, [isLoading]);

  const safeElapsed = isLoading ? elapsed : 0;
  const stage = LOADING_STAGES.findLastIndex((s) => safeElapsed * 1000 >= s.delay);

  return { label: LOADING_STAGES[stage].label, elapsed: safeElapsed };
}

/* ── state ───────────────────────────────────────────────────────── */

type AudioState = {
  isPlaying: boolean;
  isLoading: boolean;
  audioUrl: string | null;
  error: string | null;
  currentTime: number;
  duration: number;
  progress: number; // 0-1 streaming fetch progress
};

type AudioAction =
  | { type: "START_LOAD" }
  | { type: "LOAD_SUCCESS"; url: string }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "TIME_UPDATE"; currentTime: number }
  | { type: "DURATION_UPDATE"; duration: number }
  | { type: "PROGRESS"; progress: number };

function audioReducer(state: AudioState, action: AudioAction): AudioState {
  switch (action.type) {
    case "START_LOAD":
      return { ...state, isLoading: true, error: null, progress: 0 };
    case "LOAD_SUCCESS":
      return { ...state, isLoading: false, audioUrl: action.url, progress: 1 };
    case "LOAD_ERROR":
      return { ...state, isLoading: false, error: action.error };
    case "PLAY":
      return { ...state, isPlaying: true };
    case "PAUSE":
      return { ...state, isPlaying: false };
    case "TIME_UPDATE":
      return { ...state, currentTime: action.currentTime };
    case "DURATION_UPDATE":
      return { ...state, duration: action.duration };
    case "PROGRESS":
      return { ...state, progress: action.progress };
    default:
      return state;
  }
}

/* ── component ───────────────────────────────────────────────────── */

export function AudioPlayer({
  title,
  text,
  assetId,
  provider,
  generationStatus,
  estimatedDurationSeconds,
  estimatedGenerationSeconds,
  autoPlay = true,
}: AudioPlayerProps) {
  const [state, dispatch] = useReducer(audioReducer, {
    isPlaying: false,
    isLoading: false,
    audioUrl: null,
    error: null,
    currentTime: 0,
    duration: 0,
    progress: 0,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingAudioLoadRef = useRef<HTMLAudioElement | null>(null);
  const lastStartedKeyRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [offScreenReady, setOffScreenReady] = useState(false);

  const loadingStage = useLoadingStage(state.isLoading);

  const estDuration = estimatedDurationSeconds ?? estimateAudioDurationSeconds(text);
  const estGenTime = estimatedGenerationSeconds ?? estimateAudioGenerationSeconds(text);
  const providerLabel = provider ?? (assetId ? "Cached audio" : "OpenAI Speech");

  // Clean up object URL when unmounted
  useEffect(() => {
    return () => {
      pendingAudioLoadRef.current = null;
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }
    };
  }, [state.audioUrl]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
      return;
    }

    const handleSecurityPolicyViolation = (event: Event) => {
      const violation = event as SecurityPolicyViolationEvent;
      if (!pendingAudioLoadRef.current) {
        return;
      }

      if (violation.effectiveDirective === "media-src" && violation.blockedURI === "blob") {
        pendingAudioLoadRef.current = null;
        dispatch({
          type: "LOAD_ERROR",
          error: "Audio playback was blocked by the site's security policy.",
        });
      }
    };

    window.addEventListener(
      "securitypolicyviolation",
      handleSecurityPolicyViolation as EventListener,
    );

    return () => {
      window.removeEventListener(
        "securitypolicyviolation",
        handleSecurityPolicyViolation as EventListener,
      );
    };
  }, []);

  /* ── core fetch with streaming progress ───────────────────────── */

  const createAndPlay = useCallback(async (url: string, shouldAutoPlay = true) => {
    const audio = createAudioElement(url);
    if (!audio) {
      dispatch({
        type: "LOAD_ERROR",
        error: "Audio playback is not supported in this browser.",
      });
      return;
    }

    audioRef.current = audio;
    pendingAudioLoadRef.current = audio;

    let playbackLoadSettled = false;
    const settlePlaybackLoad = () => {
      if (playbackLoadSettled) {
        return false;
      }

      playbackLoadSettled = true;
      if (pendingAudioLoadRef.current === audio) {
        pendingAudioLoadRef.current = null;
      }
      return true;
    };

    audio.addEventListener("timeupdate", () =>
      dispatch({ type: "TIME_UPDATE", currentTime: audio.currentTime }),
    );
    audio.addEventListener("loadedmetadata", () => {
      settlePlaybackLoad();
      dispatch({ type: "DURATION_UPDATE", duration: audio.duration });
    });
    audio.addEventListener("play", () => dispatch({ type: "PLAY" }));
    audio.addEventListener("pause", () => dispatch({ type: "PAUSE" }));
    audio.addEventListener("ended", () => dispatch({ type: "PAUSE" }));
    audio.addEventListener("error", () => {
      if (!settlePlaybackLoad()) {
        return;
      }

      dispatch({
        type: "LOAD_ERROR",
        error: "Audio generated, but the browser could not load it.",
      });
    });

    if (shouldAutoPlay) {
      // Auto-play — browsers may block without user gesture, so catch silently
      try {
        await audio.play();
      } catch {
        // Autoplay blocked; user can press play manually
        dispatch({ type: "PAUSE" });
      }
    }
  }, []);

  const fetchAndPlay = useCallback(async (forcePlay = false) => {
    dispatch({ type: "START_LOAD" });
    try {
      let response: Response;
      let fromCache = !!assetId;

      if (assetId) {
        // Serve from user-file cache — no TTS call needed
        response = await fetch(`/api/user-files/${encodeURIComponent(assetId)}`);
      } else {
        // Call TTS endpoint (which itself checks cache server-side)
        response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
      }

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const msg = body?.error || `TTS failed (${response.status})`;
        throw new Error(msg);
      }

      // Detect server-side cache hit via response header
      if (!assetId && response.headers.get("X-User-File-Id")) {
        fromCache = true;
      }

      // Stream chunks for progress tracking
      const contentLength = response.headers.get("Content-Length");
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      const responseBody = response.body;
      const reader = supportsReadableStreamReader(responseBody)
        ? responseBody.getReader()
        : null;

      if (!reader) {
        // Fallback: no streaming reader support, so buffer the response first.
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        dispatch({ type: "LOAD_SUCCESS", url });
        await createAndPlay(url, forcePlay || !fromCache);
        return;
      }

      const chunks: BlobPart[] = [];
      let receivedBytes = 0;
      const genStart = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedBytes += value.length;

        // Progress: use Content-Length if available, otherwise estimate from time
        if (totalBytes > 0) {
          dispatch({ type: "PROGRESS", progress: receivedBytes / totalBytes });
        } else {
          const elapsed = (Date.now() - genStart) / 1000;
          const estimated = Math.min(0.95, elapsed / (estGenTime * 1.2));
          dispatch({ type: "PROGRESS", progress: estimated });
        }
      }

      const blob = new Blob(chunks, { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);

      // Try MediaSource streaming if supported, else use blob URL
      dispatch({ type: "LOAD_SUCCESS", url });
      await createAndPlay(url, forcePlay || !fromCache);
    } catch (err) {
      console.error(err);
      dispatch({
        type: "LOAD_ERROR",
        error: err instanceof Error ? err.message : "Failed to generate audio.",
      });
    }
  }, [text, assetId, estGenTime, createAndPlay]);

  /* ── #1: Auto-generate on mount (guarded) ────────────────────────── */

  useEffect(() => {
    if (!text || text.trim().length === 0) return; // wait for text to arrive during streaming

    const runtimeKey = assetId ? `asset:${assetId}` : autoPlay ? `text:${text}` : null;
    if (!runtimeKey || lastStartedKeyRef.current === runtimeKey) {
      return;
    }

    lastStartedKeyRef.current = runtimeKey;

    if (assetId) {
      // Cached asset — always load it (lightweight, serves from disk)
      fetchAndPlay();
    } else if (autoPlay) {
      // First-time generation — only auto-fetch when autoPlay is true
      fetchAndPlay();
    }
  }, [fetchAndPlay, text, assetId, autoPlay]);

  /* ── #5: Off-screen toast via IntersectionObserver ─────────────── */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!supportsIntersectionObserver()) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Audio just finished loading while off-screen
        if (!entry.isIntersecting && state.audioUrl && !state.isLoading) {
          setOffScreenReady(true);
        }
        if (entry.isIntersecting) {
          setOffScreenReady(false);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [state.audioUrl, state.isLoading]);

  const scrollToPlayer = () => {
    scrollElementIntoView(containerRef.current, getUserScrollBehavior(), "center");
    setOffScreenReady(false);
  };

  /* ── playback controls ─────────────────────────────────────────── */

  function handlePlayToggle() {
    if (state.error || state.isLoading) return;

    // If audio isn't loaded yet (e.g. autoPlay was false), fetch and play now
    if (!audioRef.current && !state.audioUrl) {
      fetchAndPlay(true);
      return;
    }

    if (audioRef.current) {
      if (state.isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      return;
    }
    // Edge case: fetch completed but audio element wasn't created (shouldn't happen)
    if (state.audioUrl && !audioRef.current) {
      createAndPlay(state.audioUrl);
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    dispatch({ type: "TIME_UPDATE", currentTime: time });
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleDownload = () => {
    if (!state.audioUrl) return;
    downloadFileFromUrl(
      state.audioUrl,
      `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.mp3`,
    );
  };

  /* ── derived values ────────────────────────────────────────────── */

  const status = state.isLoading
    ? "loading"
    : state.error
      ? "error"
      : "success";

  const progressPercent = Math.round(state.progress * 100);

  const subtitleContent = state.error ? (
    <span className="text-red-500">{state.error}</span>
  ) : state.isLoading ? (
    <span className="text-accent animate-pulse">
      {loadingStage.label} ({loadingStage.elapsed}s)
      {" · "}
      <span className="opacity-70">
        ~{estDuration}s audio · est. {estGenTime}s to generate
      </span>
    </span>
  ) : state.audioUrl ? (
    <span>
      {providerLabel} · {formatTime(state.duration)}
    </span>
  ) : (
    <span className="opacity-70">
      {generationStatus === "cached_asset" ? "Cached audio ready" : "Click play to load"} · ~{estDuration}s audio
    </span>
  );

  /* ── render ────────────────────────────────────────────────────── */

  return (
    <>
      <div ref={containerRef}>
        <ToolCard
          title={title || "Generated Audio"}
          subtitle={subtitleContent}
          status={status}
          onDownload={state.audioUrl ? handleDownload : undefined}
          downloadTooltip="Download MP3"
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          }
        >
          <div className="flex w-full flex-col gap-(--space-cluster-tight) px-(--space-inset-compact) py-(--space-inset-compact)">
            {/* ── Progress bar (during loading) ──────────────────────── */}
            {state.isLoading && (
              <div className="w-full h-1 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            {/* ── Control Row ────────────────────────────────────────── */}
            <div className="flex items-center gap-(--space-3)">
              <button
                onClick={handlePlayToggle}
                disabled={state.isLoading || !!state.error}
                className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-accent-interactive text-accent-foreground hover:bg-accent-interactive/90 transition-all disabled:opacity-50 active:scale-95 shadow-sm"
              >
                {state.isLoading ? (
                  <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                ) : state.isPlaying ? (
                  <svg className="w-4 h-4 fill-current ml-px" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg className="ml-px h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>

              {/* Shuttle & Timestamps */}
              <div className="flex flex-col flex-1 gap-(--space-1) min-w-0">
                <input
                  type="range"
                  min={0}
                  max={state.duration || 100}
                  value={state.currentTime}
                  onChange={handleSeek}
                  disabled={!state.audioUrl}
                  className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-accent-interactive"
                  style={{
                    background: state.audioUrl
                      ? `linear-gradient(to right, var(--accent-interactive) ${(state.currentTime / state.duration) * 100}%, var(--border) ${(state.currentTime / state.duration) * 100}%)`
                      : undefined,
                  }}
                />
                <div className="flex justify-between text-[10px] font-mono text-text/50">
                  <span>{formatTime(state.currentTime)}</span>
                  <span>
                    {state.audioUrl
                      ? formatTime(state.duration)
                      : `~${formatTime(estDuration)}`}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </ToolCard>
      </div>

      {/* ── #5: Off-screen toast ──────────────────────────────────── */}
      {offScreenReady && (
        <div className="fixed bottom-(--space-6) left-1/2 z-9999 -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <button
            type="button"
            onClick={scrollToPlayer}
            className="flex items-center gap-(--space-2) rounded-full accent-fill px-(--space-4) py-(--space-2) text-xs font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-95"
          >
            <span>🎧</span>
            <span>Audio ready — {title}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
