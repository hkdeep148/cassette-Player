import { useEffect, useRef, memo } from "react";

type YouTubePlayerProps = {
  playlistId: string;
  onReady: (player: any) => void;
  onTrackChange: (track: string) => void;
  onProgress: (time: number, duration: number) => void;
  onPlaybackStateChange: (state: number) => void;
};

// Global state — survives React re-mounts
let globalPlayer: any = null;
let hasInitialized = false;
let currentPlaylistId = "";

const callbackStore: {
  onReady?: (player: any) => void;
  onTrackChange?: (track: string) => void;
  onProgress?: (time: number, duration: number) => void;
  onPlaybackStateChange?: (state: number) => void;
} = {};

function YouTubePlayer({
  playlistId,
  onReady,
  onTrackChange,
  onProgress,
  onPlaybackStateChange,
}: YouTubePlayerProps) {
  const progressIntervalRef = useRef<number | null>(null);
  const lastTrackRef = useRef("");

  callbackStore.onReady = onReady;
  callbackStore.onTrackChange = onTrackChange;
  callbackStore.onProgress = onProgress;
  callbackStore.onPlaybackStateChange = onPlaybackStateChange;

  /* ═══════════════════════════════════════
     INITIAL PLAYER SETUP (runs once)
     ═══════════════════════════════════════ */

  useEffect(() => {
    const updateTrackInfo = () => {
      const player = globalPlayer;
      if (!player) return;

      try {
        const videoData = player.getVideoData?.();

        if (videoData?.title && videoData.title !== lastTrackRef.current) {
          lastTrackRef.current = videoData.title;
          callbackStore.onTrackChange?.(videoData.title);
        }

        const currentTime = player.getCurrentTime?.() ?? 0;
        const duration = player.getDuration?.() ?? 0;
        callbackStore.onProgress?.(currentTime, duration);
      } catch {
        // Player not ready
      }
    };

    const startProgressUpdates = () => {
      if (progressIntervalRef.current !== null) return;
      progressIntervalRef.current = window.setInterval(updateTrackInfo, 500);
    };

    const stopProgressUpdates = () => {
      if (progressIntervalRef.current !== null) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };

    const createPlayer = () => {
      const YT = (window as any).YT;
      if (!YT?.Player) return;
      if (globalPlayer) return;

      console.log("🎬 Creating YouTube player with playlist:", playlistId);
      currentPlaylistId = playlistId;

      globalPlayer = new YT.Player("youtube-player", {
        width: "200",
        height: "200",
        playerVars: {
          playsinline: 1,
          listType: "playlist",
          list: playlistId,
          autoplay: 0,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          loop: 1,
          origin: window.location.origin,
          enablejsapi: 1,
          fs: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event: any) => {
            console.log("✅ Player ready");
            callbackStore.onReady?.(event.target);
            updateTrackInfo();
            startProgressUpdates();
          },
          onStateChange: (event: any) => {
            console.log("📺 YouTube state:", event.data);
            callbackStore.onPlaybackStateChange?.(event.data);
            updateTrackInfo();
          },
          onError: (event: any) => {
            const errorCode = event.data;
            console.error("❌ YouTube error code:", errorCode);

            const skipErrors = [100, 101, 150, 5, 2];

            if (skipErrors.includes(errorCode)) {
              console.warn(
                `⏭ Video blocked (error ${errorCode}) — skipping to next`
              );
              setTimeout(() => {
                try {
                  globalPlayer?.nextVideo();
                } catch (e) {
                  console.error("Skip failed:", e);
                }
              }, 500);
            } else {
              setTimeout(() => {
                try {
                  globalPlayer?.playVideo();
                } catch (e) {
                  console.error("Recovery failed:", e);
                }
              }, 1000);
            }
          },
        },
      });
    };


    /* ═══════════════════════════════════════
       MAIN LOGIC
       ═══════════════════════════════════════ */

    if (hasInitialized && globalPlayer) {
      console.log("♻️ Reusing existing YouTube player");
      try {
        callbackStore.onReady?.(globalPlayer);
        startProgressUpdates();
      } catch (e) {
        console.error("Reuse failed:", e);
      }
      return () => stopProgressUpdates();
    }

    hasInitialized = true;

    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );

    if (existingScript && (window as any).YT?.Player) {
      createPlayer();
    } else if (existingScript) {
      (window as any).onYouTubeIframeAPIReady = createPlayer;
    } else {
      (window as any).onYouTubeIframeAPIReady = createPlayer;
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      stopProgressUpdates();
    };
  }, []); // ← intentionally empty, only runs once


  /* ═══════════════════════════════════════
     ⭐ WATCH FOR PLAYLIST ID CHANGES
     Load the new playlist when user changes it
     ═══════════════════════════════════════ */

  useEffect(() => {
    // Skip on first render (initial playlist set during create)
    if (!globalPlayer) return;
    if (playlistId === currentPlaylistId) return;

    console.log("🔄 Loading new playlist:", playlistId);
    currentPlaylistId = playlistId;

    // Reset track cache
    lastTrackRef.current = "";

    try {
      globalPlayer.loadPlaylist({
        list: playlistId,
        listType: "playlist",
        index: 0,
        startSeconds: 0,
      });

      // Optional: pause immediately so it doesn't auto-play the new list
      setTimeout(() => {
        try {
          globalPlayer?.pauseVideo();
        } catch {}
      }, 500);
    } catch (error) {
      console.error("Failed to load new playlist:", error);
    }
  }, [playlistId]);


  return (
    <div
      id="youtube-player"
      style={{
        position: "fixed",
        width: "1px",
        height: "1px",
        left: "-10px",
        top: "-10px",
        opacity: 0,
        pointerEvents: "none",
      }}
    />
  );
}

export default memo(YouTubePlayer);