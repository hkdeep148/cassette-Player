import { useState, useRef, useEffect } from "react";
import type { MouseEvent, PointerEvent } from "react";
import { useDeckStatus } from "../../hooks/useDeckStatus";

// Transport button imports
import rewBtn from "../../assets/deck/buttons/rew.png";
import playBtn from "../../assets/deck/buttons/play.png";
import ffBtn from "../../assets/deck/buttons/ff.png";
import stopBtn from "../../assets/deck/buttons/stop.png";
import pauseBtn from "../../assets/deck/buttons/pause.png";
import ejectBtn from "../../assets/deck/buttons/eject.png";
import powerBtn from "../../assets/deck/buttons/power.png";
import resetBtn from "../../assets/deck/buttons/reset-button.png";
import cassetteStill from "../../assets/deck/cassette/cassette-still.png";
import DeckHeader from "./DeckHeader";
import { useLidState } from "../../hooks/useLidState";

// Cassette videos (3 variations)
import cassetteSpin from "../../assets/deck/cassette/cassette-spin.gif";
import cassetteSpinFast from "../../assets/deck/cassette/cassette-spin-fast.mp4";
import cassetteSpinReverse from "../../assets/deck/cassette/cassette-spin-reverse.mp4";

// Frame and knob assets
import deckFrame from "../../assets/deck/frame/deck-frame.png";
import volumeKnobImg from "../../assets/deck/knobs/volume-knob.png";


/* ==========================================
   TYPES
   ========================================== */

type CassetteDeckProps = {
  youtubePlayer: any;
  currentTrack: string;
  currentTime: number;
  duration: number;
  youtubeState: number;
  deckActionsRef?: React.MutableRefObject<{
    openLid: () => void;
    openLidInstantly: () => void;
    closeLid: () => void;
    showLoading: () => void;
    showSwapping: () => void;
    triggerPlay: () => void;
    isLidOpen: () => boolean;
  } | null>;
  onLidClosedAfterPlaylistSwap?: () => void;
  isSwappingPlaylist?: boolean;
};

type PlayMode =
  | "stopped"
  | "playing"
  | "paused"
  | "fastForward"
  | "rewinding";

type ActiveVideo = "normal" | "fast" | "reverse" | "none";


/* ==========================================
   HELPERS
   ========================================== */

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

function MechanicalCounter({ value }: { value: number }) {
  const paddedValue = value.toString().padStart(3, "0");
  const digits = paddedValue.split("").map(Number);

  return (
    <div className="counter-wheels">
      {digits.map((digit, index) => (
        <div key={index} className="counter-wheel">
          <div
            className="counter-wheel-strip"
            style={{
              transform: `translateY(-${digit * 10}%)`,
            }}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <div key={n} className="counter-digit">
                {n}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


/* ==========================================
   MAIN COMPONENT
   ========================================== */

function CassetteDeck({
  youtubePlayer,
  currentTrack,
  currentTime,
  duration,
  youtubeState,
  deckActionsRef,
  onLidClosedAfterPlaylistSwap,
  isSwappingPlaylist,
}: CassetteDeckProps) {

  /* ==========================================
     STATE
     ========================================== */

  const [playMode, setPlayMode] = useState<PlayMode>("stopped");
  const [volume, setVolume] = useState(100);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isDraggingBalance, setIsDraggingBalance] = useState(false);
  const [isPowerOn, setIsPowerOn] = useState(true);
  const [activeVideo, setActiveVideo] = useState<ActiveVideo>("none");
  const [tapeCounter, setTapeCounter] = useState(0);
  const [tapePosition, setTapePosition] = useState(2);


  /* ==========================================
     STATUS MESSAGES
     ========================================== */

  const { statusMessage, showStatus } = useDeckStatus();


  /* ==========================================
     REFS
     ========================================== */

  const cassetteFastRef = useRef<HTMLVideoElement>(null);
  const cassetteReverseRef = useRef<HTMLVideoElement>(null);
  const seekTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const prevLidStateRef = useRef<string>("closed");
  const wasSwappingRef = useRef(false);
  const wasPlayingBeforeOpen = useRef(false);


  /* ==========================================
     LID STATE
     ========================================== */

  const {
    lidState,
    toggleLid,
    setLidOpenInstantly,
    forceCloseLid,
    handleOpenAnimationEnd,
    handleCloseAnimationEnd,
    isOpen,
  } = useLidState();


  /* ==========================================
     CASSETTE VISUAL STATE
     ========================================== */

  const cassetteVisualState =
    playMode === "fastForward"
      ? "fastForward"
      : playMode === "rewinding"
      ? "rewinding"
      : playMode === "stopped"
      ? "stopped"
      : playMode === "paused"
      ? "paused"
      : youtubeState === 1
      ? "playing"
      : youtubeState === 3
      ? "buffering"
      : youtubeState === 2
      ? "paused"
      : youtubeState === 0
      ? "stopped"
      : playMode === "playing"
      ? "playing"
      : "stopped";


  /* ==========================================
     EXPOSE DECK ACTIONS TO PARENT (App.tsx)
     ========================================== */

  useEffect(() => {
    if (!deckActionsRef) return;

    deckActionsRef.current = {
      openLid: () => {
        if (lidState === "closed") {
          toggleLid();
        }
      },
      openLidInstantly: () => {
        setLidOpenInstantly();
      },
      closeLid: () => {
        forceCloseLid();
      },
      showLoading: () => {
        showStatus("⌛  LOADING...", 2500);
      },
      showSwapping: () => {
        showStatus("⏏  INSERT CASSETTE", 3000);
      },
      triggerPlay: () => {
        setPlayMode("playing");
        showStatus("▶  PLAYING");
        if (youtubePlayer) {
          try {
            youtubePlayer.playVideo();
          } catch (error) {
            console.error("Play failed:", error);
          }
        }
      },
      isLidOpen: () => isOpen,
    };
  }, [
    deckActionsRef,
    lidState,
    isOpen,
    toggleLid,
    setLidOpenInstantly,
    forceCloseLid,
    showStatus,
    youtubePlayer,
  ]);


  /* ==========================================
     TRACK SWAP FLAG
     ========================================== */

  useEffect(() => {
    if (isSwappingPlaylist) {
      wasSwappingRef.current = true;
    }
  }, [isSwappingPlaylist]);


  /* ==========================================
     DETECT LID CLOSED → NOTIFY APP
     ========================================== */

  useEffect(() => {
    const prev = prevLidStateRef.current;
    prevLidStateRef.current = lidState;

    if (lidState !== "closed") return;
    if (prev === "closed") return;

    if (wasSwappingRef.current) {
      wasSwappingRef.current = false;
      if (onLidClosedAfterPlaylistSwap) {
        onLidClosedAfterPlaylistSwap();
      }
    }
  }, [lidState, onLidClosedAfterPlaylistSwap]);


  /* ==========================================
     AUTO-SYNC playMode with YouTube state
     ========================================== */

  useEffect(() => {
    if (
      playMode === "fastForward" ||
      playMode === "rewinding" ||
      playMode === "paused" ||
      playMode === "stopped"
    ) {
      return;
    }

    if (youtubeState === 1 && playMode !== "playing") {
      setPlayMode("playing");
    }
  }, [youtubeState, playMode]);


  /* ==========================================
     BOOT MESSAGE
     ========================================== */

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      showStatus("◉  DECK READY", 2500);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [showStatus]);


  /* ==========================================
     TAPE COUNTER
     ========================================== */

  useEffect(() => {
    if (youtubeState === 1 && currentTime > 0) {
      const counterValue = Math.floor(currentTime / 2);
      setTapeCounter(counterValue % 1000);
    }
  }, [currentTime, youtubeState]);


  /* ==========================================
     AUTO-RECOVERY
     ========================================== */

  useEffect(() => {
    if (
      youtubeState === -1 &&
      playMode === "playing" &&
      youtubePlayer
    ) {
      const timeoutId = setTimeout(() => {
        try {
          youtubePlayer.playVideo();
        } catch (error) {
          console.error("Auto-resume failed:", error);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [youtubeState, playMode, youtubePlayer]);


  /* ==========================================
     AUTO-ADVANCE
     ========================================== */

  useEffect(() => {
    if (youtubeState === 0 && youtubePlayer && playMode !== "stopped") {
      const timeoutId = setTimeout(() => {
        try {
          youtubePlayer.nextVideo();
        } catch (error) {
          console.error("Next video failed:", error);
          try {
            youtubePlayer.seekTo(0, true);
            youtubePlayer.playVideo();
          } catch {}
        }
      }, 200);

      return () => clearTimeout(timeoutId);
    }
  }, [youtubeState, youtubePlayer, playMode]);


  /* ==========================================
     LID EJECT / RESUME (manual only)
     ========================================== */

  useEffect(() => {
    if (!youtubePlayer) return;

    // Skip during playlist swap — App handles it
    if (isSwappingPlaylist) return;

    if (lidState === "opening") {
      wasPlayingBeforeOpen.current = youtubeState === 1;

      try {
        youtubePlayer.pauseVideo();
      } catch (error) {
        console.error("Pause on eject failed:", error);
      }

      return;
    }

    if (lidState === "closed" && wasPlayingBeforeOpen.current) {
      const resumeTimer = window.setTimeout(() => {
        try {
          youtubePlayer.playVideo();
          setPlayMode("playing");
          showStatus("▶  RESUMING");
        } catch (error) {
          console.error("Resume after eject failed:", error);
        }

        wasPlayingBeforeOpen.current = false;
      }, 1000);

      return () => {
        window.clearTimeout(resumeTimer);
      };
    }
  }, [
    lidState,
    youtubePlayer,
    youtubeState,
    showStatus,
    isSwappingPlaylist,
  ]);


  /* ==========================================
     CASSETTE VIDEO SYNC
     ========================================== */

  useEffect(() => {
    const fast = cassetteFastRef.current;
    const reverse = cassetteReverseRef.current;

    if (!fast || !reverse) return;

    fast.loop = true;
    reverse.loop = true;

    if (cassetteVisualState === "fastForward") {
      setActiveVideo("fast");
      fast.play().catch(() => {});
      reverse.pause();
    } else if (cassetteVisualState === "rewinding") {
      setActiveVideo("reverse");
      reverse.play().catch(() => {});
      fast.pause();
    } else if (
      cassetteVisualState === "playing" ||
      cassetteVisualState === "buffering"
    ) {
      setActiveVideo("normal");
      fast.pause();
      reverse.pause();
    } else {
      setActiveVideo("none");
      fast.pause();
      reverse.pause();
      fast.currentTime = 0;
      reverse.currentTime = 0;
    }
  }, [cassetteVisualState]);


  /* ==========================================
     SEEK HELPERS
     ========================================== */

  const stopSeek = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (seekTimerRef.current !== null) {
      window.clearInterval(seekTimerRef.current);
      seekTimerRef.current = null;
    }

    setPlayMode((prev) => {
      if (prev === "fastForward" || prev === "rewinding") {
        if (youtubePlayer) {
          try {
            youtubePlayer.playVideo();
          } catch (error) {
            console.error("Resume after seek failed:", error);
          }
        }
        return "playing";
      }
      return prev;
    });
  };

  const startSeek = (direction: "forward" | "reverse") => {
    longPressTriggeredRef.current = false;

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;

      setPlayMode(
        direction === "forward" ? "fastForward" : "rewinding"
      );

      showStatus(
        direction === "forward"
          ? "▶▶  FAST FORWARD"
          : "◀◀  REWIND"
      );

      seekTimerRef.current = window.setInterval(() => {
        if (!youtubePlayer) return;

        try {
          const current = youtubePlayer.getCurrentTime?.() ?? 0;
          const total = youtubePlayer.getDuration?.() ?? duration;

          const nextTime =
            direction === "forward"
              ? Math.min(total, current + 2)
              : Math.max(0, current - 2);

          youtubePlayer.seekTo(nextTime, true);
        } catch (error) {
          console.error("Seek failed:", error);
        }
      }, 100);
    }, 500);
  };

  const handleSeekButtonUp = (direction: "forward" | "reverse") => {
    const wasLongPress = longPressTriggeredRef.current;

    stopSeek();

    if (!wasLongPress && youtubePlayer) {
      try {
        if (direction === "forward") {
          youtubePlayer.nextVideo();
        } else {
          youtubePlayer.previousVideo();
        }
      } catch (error) {
        console.error("Track change failed:", error);
      }
    }

    longPressTriggeredRef.current = false;
  };


  /* ==========================================
     VOLUME
     ========================================== */

  const VOLUME_MIN_ANGLE = -95;
  const VOLUME_MAX_ANGLE = 176;

  const volumeAngle =
    VOLUME_MIN_ANGLE +
    (volume / 100) * (VOLUME_MAX_ANGLE - VOLUME_MIN_ANGLE);

  const startVolumeDrag = (event: PointerEvent<HTMLDivElement>) => {
    setIsDraggingVolume(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.startX = String(event.clientX);
    event.currentTarget.dataset.startY = String(event.clientY);
    event.currentTarget.dataset.startVolume = String(volume);
  };

  const moveVolumeDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingVolume) return;

    const startX = Number(event.currentTarget.dataset.startX);
    const startY = Number(event.currentTarget.dataset.startY);
    const startVolume = Number(event.currentTarget.dataset.startVolume);

    const deltaX = event.clientX - startX;
    const deltaY = startY - event.clientY;

    const combinedDelta = (deltaX + deltaY) * 0.5;

    const newVolume = Math.max(0, Math.min(100, startVolume + combinedDelta));
    setVolume(newVolume);

    showStatus(`🔊  VOLUME: ${Math.round(newVolume)}%`, 1000);

    if (youtubePlayer) {
      youtubePlayer.setVolume(Math.round(newVolume));
    }
  };

  const stopVolumeDrag = (event: PointerEvent<HTMLDivElement>) => {
    setIsDraggingVolume(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}
  };


  /* ==========================================
     BALANCE
     ========================================== */

  const BALANCE_MIN_ANGLE = -95;
  const BALANCE_MAX_ANGLE = 180;

  const balanceAngle =
    BALANCE_MIN_ANGLE +
    ((balance + 100) / 200) * (BALANCE_MAX_ANGLE - BALANCE_MIN_ANGLE);

  const startBalanceDrag = (event: PointerEvent<HTMLDivElement>) => {
    setIsDraggingBalance(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.startX = String(event.clientX);
    event.currentTarget.dataset.startY = String(event.clientY);
    event.currentTarget.dataset.startBalance = String(balance);
  };

  const moveBalanceDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingBalance) return;

    const startX = Number(event.currentTarget.dataset.startX);
    const startY = Number(event.currentTarget.dataset.startY);
    const startBalance = Number(event.currentTarget.dataset.startBalance);

    const deltaX = event.clientX - startX;
    const deltaY = startY - event.clientY;

    const combinedDelta = (deltaX + deltaY) * 0.5;

    const newBalance = Math.max(-100, Math.min(100, startBalance + combinedDelta));
    setBalance(newBalance);

    const balanceLabel =
      newBalance === 0
        ? "CENTER"
        : newBalance < 0
        ? `L ${Math.abs(Math.round(newBalance))}`
        : `R ${Math.round(newBalance)}`;
    showStatus(`⚖  BALANCE: ${balanceLabel}`, 1000);
  };

  const stopBalanceDrag = (event: PointerEvent<HTMLDivElement>) => {
    setIsDraggingBalance(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}
  };


  /* ==========================================
     TAPE SELECTOR
     ========================================== */

  const tapeAngle = -6 + tapePosition * 25;

  const getTapeLabel = () => {
    if (tapePosition === 0) return "NORMAL";
    if (tapePosition === 1) return "NORMAL+";
    if (tapePosition === 2) return "CrO₂";
    if (tapePosition === 3) return "CrO₂+";
    return "METAL";
  };

  const cycleTape = () => {
    setTapePosition((current) => {
      const next = (current + 1) % 5;
      const labels = ["NORMAL", "NORMAL+", "CrO₂", "CrO₂+", "METAL"];
      showStatus(`⚙  TAPE: ${labels[next]}`);
      return next;
    });
  };

  const cycleTapeBack = () => {
    setTapePosition((current) => {
      const next = current === 0 ? 4 : current - 1;
      const labels = ["NORMAL", "NORMAL+", "CrO₂", "CrO₂+", "METAL"];
      showStatus(`⚙  TAPE: ${labels[next]}`);
      return next;
    });
  };


  /* ==========================================
     PROGRESS BAR
     ========================================== */

  const handleProgressClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!youtubePlayer || duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clickPosition = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickPosition / rect.width));
    const targetTime = percentage * duration;
    try {
      youtubePlayer.seekTo(targetTime, true);
    } catch (error) {
      console.error("Progress seek failed:", error);
    }
  };

  const progressPercentage =
    duration > 0
      ? Math.max(0, Math.min(100, (currentTime / duration) * 100))
      : 0;


  /* ==========================================
     RENDER
     ========================================== */

  return (
    <div className={`cassette-deck ${isPowerOn ? "power-on" : "power-off"} lid-${lidState}`}>

      <img
        className="deck-frame-image"
        src={deckFrame}
        alt="Cassette deck frame"
        draggable={false}
      />

      <div className="deck-tape-counter">
        <MechanicalCounter value={tapeCounter} />
      </div>

      <div className={`deck-cassette-slot ${cassetteVisualState}`}>
        <img
          className="deck-cassette-still"
          src={cassetteStill}
          alt=""
          draggable={false}
        />
        <img
          className={`deck-cassette-video deck-cassette-gif ${
            activeVideo === "normal" ? "active" : ""
          }`}
          src={cassetteSpin}
          alt=""
          draggable={false}
        />
        <video
          ref={cassetteFastRef}
          className={`deck-cassette-video ${
            activeVideo === "fast" ? "active" : ""
          }`}
          src={cassetteSpinFast}
          poster={cassetteStill}
          loop
          muted
          playsInline
          preload="auto"
        />
        <video
          ref={cassetteReverseRef}
          className={`deck-cassette-video ${
            activeVideo === "reverse" ? "active" : ""
          }`}
          src={cassetteSpinReverse}
          poster={cassetteStill}
          loop
          muted
          playsInline
          preload="auto"
        />
      </div>

      <div className="deck-playlist-display">
        <div className="deck-playlist-inner">
          {statusMessage ? (
            <div className="deck-status-message">
              <span className="deck-playlist-text deck-status-text">
                {statusMessage}
              </span>
            </div>
          ) : (
            <div className="deck-playlist-scroll">
              <span className="deck-playlist-text">
                {currentTrack || "No track loaded"}
              </span>
              <span className="deck-playlist-text">
                {currentTrack || "No track loaded"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="deck-transport-grid">

        <button
          type="button"
          className="deck-btn"
          aria-label="Previous song / Rewind"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            startSeek("reverse");
          }}
          onPointerUp={(event) => {
            try {
              event.currentTarget.releasePointerCapture(event.pointerId);
            } catch {}
            handleSeekButtonUp("reverse");
          }}
          onPointerCancel={() => {
            stopSeek();
            longPressTriggeredRef.current = false;
          }}
        >
          <img src={rewBtn} alt="" draggable={false} />
        </button>

        <button
          type="button"
          className={`deck-btn ${youtubeState === 1 ? "active" : ""}`}
          aria-label="Play"
          onClick={() => {
            if (!isPowerOn) return;

            if (isOpen || lidState !== "closed") {
              showStatus("⏏  CLOSE DECK FIRST");
              return;
            }

            setPlayMode("playing");
            showStatus("▶  PLAYING");

            if (youtubePlayer) {
              youtubePlayer.playVideo();
            }
          }}
        >
          <img src={playBtn} alt="" draggable={false} />
        </button>

        <button
          type="button"
          className="deck-btn"
          aria-label="Next song / Fast Forward"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            startSeek("forward");
          }}
          onPointerUp={(event) => {
            try {
              event.currentTarget.releasePointerCapture(event.pointerId);
            } catch {}
            handleSeekButtonUp("forward");
          }}
          onPointerCancel={() => {
            stopSeek();
            longPressTriggeredRef.current = false;
          }}
        >
          <img src={ffBtn} alt="" draggable={false} />
        </button>

        <button
          type="button"
          className="deck-btn deck-btn-bottom"
          aria-label={isOpen ? "Close deck" : "Eject cassette"}
          aria-pressed={isOpen}
          onClick={() => {
            if (!isPowerOn) return;
            showStatus(isOpen ? "⏏  CLOSING..." : "⏏  EJECTING...", 2500);
            toggleLid();
          }}
        >
          <img src={ejectBtn} alt="" draggable={false} />
        </button>

        <button
          type="button"
          className={`deck-btn deck-btn-bottom ${
            playMode === "paused" || youtubeState === 2 ? "active" : ""
          }`}
          aria-label="Pause"
          onClick={() => {
            if (!isPowerOn) return;
            setPlayMode("paused");
            showStatus("❚❚  PAUSED");
            if (youtubePlayer) {
              try {
                youtubePlayer.pauseVideo();
              } catch (error) {
                console.error("Pause failed:", error);
              }
            }
          }}
        >
          <img src={pauseBtn} alt="" draggable={false} />
        </button>

        <button
          type="button"
          className="deck-btn deck-btn-bottom"
          aria-label="Stop"
          onClick={() => {
            if (!isPowerOn) return;
            setPlayMode("stopped");
            showStatus("■  STOPPED");
            if (youtubePlayer) youtubePlayer.stopVideo();
          }}
        >
          <img src={stopBtn} alt="" draggable={false} />
        </button>

      </div>

      <button
        type="button"
        className={`deck-power-button-image ${isPowerOn ? "on" : "off"}`}
        aria-label="Power"
        aria-pressed={isPowerOn}
        onClick={() => {
          const turningOff = isPowerOn;
          setIsPowerOn(!turningOff);

          if (turningOff) {
            showStatus("○  POWER OFF");
          } else {
            showStatus("◉  POWER ON", 2500);
          }

          if (turningOff && youtubePlayer) {
            try {
              youtubePlayer.pauseVideo();
            } catch {}
            setPlayMode("stopped");
          }
        }}
      >
        <img src={powerBtn} alt="" draggable={false} />
      </button>

      <button
        type="button"
        className="deck-reset-button"
        aria-label="Reset"
        onClick={() => {
          if (!isPowerOn) return;
          setPlayMode("stopped");
          setTapeCounter(0);
          showStatus("↺  RESET");
          if (youtubePlayer) {
            try {
              youtubePlayer.stopVideo();
              setTimeout(() => {
                youtubePlayer.playVideoAt(0);
              }, 300);
            } catch (error) {
              console.error("Reset failed:", error);
            }
          }
        }}
      >
        <img src={resetBtn} alt="" draggable={false} />
      </button>

      <div
        className={`deck-volume-knob ${isDraggingVolume ? "dragging" : ""}`}
        onPointerDown={startVolumeDrag}
        onPointerMove={moveVolumeDrag}
        onPointerUp={stopVolumeDrag}
        onPointerCancel={stopVolumeDrag}
      >
        <img
          className="deck-knob-image"
          src={volumeKnobImg}
          alt="Volume"
          draggable={false}
          style={{
            transform: `rotate(${volumeAngle}deg)`,
          }}
        />
      </div>

      <div
        className={`deck-balance-knob ${isDraggingBalance ? "dragging" : ""}`}
        onPointerDown={startBalanceDrag}
        onPointerMove={moveBalanceDrag}
        onPointerUp={stopBalanceDrag}
        onPointerCancel={stopBalanceDrag}
      >
        <img
          className="deck-knob-image"
          src={volumeKnobImg}
          alt="Balance"
          draggable={false}
          style={{
            transform: `rotate(${balanceAngle}deg)`,
          }}
        />
      </div>

      <div
        className="deck-tape-selector"
        onClick={cycleTape}
        onContextMenu={(e) => {
          e.preventDefault();
          cycleTapeBack();
        }}
        role="button"
        tabIndex={0}
        aria-label={`Tape type: ${getTapeLabel()}`}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " " || event.key === "ArrowRight") {
            event.preventDefault();
            cycleTape();
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            cycleTapeBack();
          }
        }}
      >
        <img
          className="deck-knob-image"
          src={volumeKnobImg}
          alt="Tape selector"
          draggable={false}
          style={{
            transform: `rotate(${tapeAngle}deg)`,
          }}
        />
      </div>

      <DeckHeader
        lidState={lidState}
        onOpenEnd={handleOpenAnimationEnd}
        onCloseEnd={handleCloseAnimationEnd}
      />

      <div
        className="deck-progress-track"
        onClick={handleProgressClick}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        aria-valuenow={currentTime}
        tabIndex={0}
      >
        <div
          className="deck-progress-fill"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div className="deck-time-current">
        {formatTime(currentTime)}
      </div>

      <div className="deck-time-total">
        {formatTime(duration)}
      </div>

    </div>
  );
}

export default CassetteDeck;