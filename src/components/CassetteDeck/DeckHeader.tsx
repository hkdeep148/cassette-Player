import { useState, useEffect, useRef } from "react";
import type { LidState } from "../../hooks/useLidState";

import openGif from "../../assets/deck/animations/open.gif";
import closeGif from "../../assets/deck/animations/close.gif";

const ANIMATION_DURATION_MS = 2000;

type DeckHeaderProps = {
  lidState: LidState;
  onOpenEnd: () => void;
  onCloseEnd: () => void;
};

function DeckHeader({ lidState, onOpenEnd, onCloseEnd }: DeckHeaderProps) {
  const [openSrc, setOpenSrc] = useState<string>(openGif);
  const [closeSrc, setCloseSrc] = useState<string>(closeGif);
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);

  const openImgRef = useRef<HTMLImageElement>(null);
  const closeImgRef = useRef<HTMLImageElement>(null);
  const prevLidStateRef = useRef<LidState>("closed");
  const gifsReadyRef = useRef(false);

  /* ==========================================
     AGGRESSIVE PRELOAD — decode BOTH GIFs on mount
     ========================================== */
  useEffect(() => {
    const decodeGif = (url: string): Promise<void> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          if (img.decode) {
            img.decode().then(() => resolve()).catch(() => resolve());
          } else {
            resolve();
          }
        };
        img.onerror = () => resolve();
        img.src = url;
      });
    };

    Promise.all([decodeGif(openGif), decodeGif(closeGif)]).then(() => {
      gifsReadyRef.current = true;
    });
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const prev = prevLidStateRef.current;
    prevLidStateRef.current = lidState;

    /* ==========================================
       INSTANT JUMP: closed → open (playlist swap)
       ========================================== */
    if (lidState === "open" && prev === "closed") {
      setShowOpen(false);
      setShowClose(false);
      return;
    }

    /* ==========================================
       OPENING
       ========================================== */
    if (lidState === "opening") {
      const img = openImgRef.current;
      if (!img) return;

      const newSrc = `${openGif}#${Date.now()}`;

      const showIt = () => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setShowOpen(true);
            setShowClose(false);
          });
        });
      };

      img.onload = showIt;
      setOpenSrc(newSrc);

      if (img.complete && img.naturalWidth > 0) {
        showIt();
      }

      timeoutId = setTimeout(onOpenEnd, ANIMATION_DURATION_MS);
      return () => clearTimeout(timeoutId);
    }

    /* ==========================================
       CLOSING — show INSTANTLY
       ========================================== */
    if (lidState === "closing") {
      setShowClose(true);
      setShowOpen(false);

      // Restart GIF animation by changing src (browser plays from frame 0)
      const newSrc = `${closeGif}#${Date.now()}`;
      setCloseSrc(newSrc);

      const img = closeImgRef.current;
      if (img) {
        img.src = newSrc;
      }

      timeoutId = setTimeout(onCloseEnd, ANIMATION_DURATION_MS);
      return () => clearTimeout(timeoutId);
    }

    /* ==========================================
       OPEN (idle)
       ========================================== */
    if (lidState === "open") {
      if (prev === "opening") {
        setShowOpen(true);
        setShowClose(false);
      }
    }

    /* ==========================================
       CLOSED
       ========================================== */
    if (lidState === "closed") {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShowOpen(false);
          setShowClose(false);
        });
      });
    }
  }, [lidState, onOpenEnd, onCloseEnd]);

  return (
    <div className="deck-header-overlay" aria-hidden="true">
      {/* Preloaders */}
      <img src={openGif} alt="" className="deck-header-preload" />
      <img src={closeGif} alt="" className="deck-header-preload" />

      {/* OPEN GIF layer */}
      <img
        ref={openImgRef}
        src={openSrc}
        alt=""
        className={`deck-header-gif deck-header-gif-open ${
          showOpen ? "visible" : ""
        }`}
        draggable={false}
      />

      {/* CLOSE GIF layer — always has src loaded so it's ready */}
      <img
        ref={closeImgRef}
        src={closeSrc}
        alt=""
        className={`deck-header-gif deck-header-gif-close ${
          showClose ? "visible" : ""
        }`}
        draggable={false}
      />
    </div>
  );
}

export default DeckHeader;