import { useEffect, useRef, memo } from "react";

type YouTubePlayerProps = {
  playlistId: string;
  onReady: (player: any) => void;
  onTrackChange: (track: string) => void;
  onProgress: (time: number, duration: number) => void;
  onPlaybackStateChange: (state: number) => void;
  onPlaylistLoaded?: () => void;
};

// Global player
let globalPlayer: any = null;
let hasInitialized = false;
let currentPlaylistId = "";

const callbackStore: {
  onReady?: (player: any) => void;
  onTrackChange?: (track: string) => void;
  onProgress?: (time: number, duration: number) => void;
  onPlaybackStateChange?: (state: number) => void;
  onPlaylistLoaded?: () => void;
} = {};

function YouTubePlayer({
  playlistId,
  onReady,
  onTrackChange,
  onProgress,
  onPlaybackStateChange,
  onPlaylistLoaded,
}: YouTubePlayerProps) {
  const progressIntervalRef = useRef<number | null>(null);
  const lastTrackRef = useRef("");
  const pendingPlaylistRef = useRef<string | null>(null);

  // Keep callbacks up to date
  callbackStore.onReady = onReady;
  callbackStore.onTrackChange = onTrackChange;
  callbackStore.onProgress = onProgress;
  callbackStore.onPlaybackStateChange = onPlaybackStateChange;
  callbackStore.onPlaylistLoaded = onPlaylistLoaded;

  const updateTrackInfo = () => {
    const player = globalPlayer;

    if (!player) return;

    try {
      const videoData = player.getVideoData?.();

      if (
        videoData?.title &&
        videoData.title !== lastTrackRef.current
      ) {
        lastTrackRef.current = videoData.title;
        callbackStore.onTrackChange?.(videoData.title);
      }

      const currentTime = player.getCurrentTime?.() ?? 0;
      const duration = player.getDuration?.() ?? 0;

      callbackStore.onProgress?.(
        currentTime,
        duration
      );
    } catch {
      // Player is not ready yet
    }
  };

  const startProgressUpdates = () => {
    if (progressIntervalRef.current !== null) {
      return;
    }

    progressIntervalRef.current = window.setInterval(
      updateTrackInfo,
      500
    );
  };

  const stopProgressUpdates = () => {
    if (progressIntervalRef.current !== null) {
      window.clearInterval(
        progressIntervalRef.current
      );

      progressIntervalRef.current = null;
    }
  };

  const createPlayer = () => {
    const YT = (window as any).YT;

    if (!YT?.Player) return;
    if (globalPlayer) return;

    console.log(
      "Creating YouTube player with playlist:",
      playlistId
    );

    currentPlaylistId = playlistId;

    globalPlayer = new YT.Player(
      "youtube-player",
      {
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
            console.log("YouTube player ready");

            callbackStore.onReady?.(
              event.target
            );

            updateTrackInfo();
            startProgressUpdates();

            callbackStore.onPlaylistLoaded?.();
          },

          onStateChange: (event: any) => {
            console.log(
              "YouTube state:",
              event.data
            );

            callbackStore.onPlaybackStateChange?.(
              event.data
            );

            updateTrackInfo();

            /*
             * Check whether the newly requested
             * playlist has actually loaded.
             */
            if (
              pendingPlaylistRef.current &&
              currentPlaylistId ===
                pendingPlaylistRef.current
            ) {
              try {
                const playlist =
                  globalPlayer?.getPlaylist?.();

                if (
                  playlist &&
                  playlist.length > 0
                ) {
                  console.log(
                    "New playlist confirmed loaded:",
                    currentPlaylistId
                  );

                  pendingPlaylistRef.current =
                    null;

                  callbackStore.onPlaylistLoaded?.();
                }
              } catch {
                // Playlist not ready yet
              }
            }
          },

          onError: (event: any) => {
            const errorCode = event.data;

            console.error(
              "YouTube error code:",
              errorCode
            );

            const skipErrors = [
              100,
              101,
              150,
              5,
              2,
            ];

            if (
              skipErrors.includes(errorCode)
            ) {
              console.warn(
                `Video blocked (error ${errorCode}) - skipping to next`
              );

              window.setTimeout(() => {
                try {
                  globalPlayer?.nextVideo();
                } catch (error) {
                  console.error(
                    "Skip failed:",
                    error
                  );
                }
              }, 500);
            } else {
              window.setTimeout(() => {
                try {
                  globalPlayer?.playVideo();
                } catch (error) {
                  console.error(
                    "Recovery failed:",
                    error
                  );
                }
              }, 1000);
            }
          },
        },
      }
    );
  };

  /*
   * INITIAL PLAYER SETUP
   *
   * This runs only once.
   */
  useEffect(() => {
    if (
      hasInitialized &&
      globalPlayer
    ) {
      console.log(
        "Reusing existing YouTube player"
      );

      try {
        callbackStore.onReady?.(
          globalPlayer
        );

        startProgressUpdates();
      } catch (error) {
        console.error(
          "Reuse failed:",
          error
        );
      }

      return () => {
        stopProgressUpdates();
      };
    }

    hasInitialized = true;

    const existingScript =
      document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      );

    if (
      existingScript &&
      (window as any).YT?.Player
    ) {
      createPlayer();
    } else if (existingScript) {
      (
        window as any
      ).onYouTubeIframeAPIReady =
        createPlayer;
    } else {
      (
        window as any
      ).onYouTubeIframeAPIReady =
        createPlayer;

      const script =
        document.createElement(
          "script"
        );

      script.src =
        "https://www.youtube.com/iframe_api";

      script.async = true;

      document.body.appendChild(
        script
      );
    }

    return () => {
      stopProgressUpdates();
    };

    // Player intentionally created only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * PLAYLIST CHANGE
   *
   * When playlistId changes, completely stop
   * the old playlist and explicitly load the
   * new playlist starting from track 0.
   */
  useEffect(() => {
    if (!globalPlayer) return;
    if (!playlistId) return;

    if (
      playlistId === currentPlaylistId
    ) {
      return;
    }

    console.log(
      "Loading new playlist:",
      playlistId
    );

    pendingPlaylistRef.current =
      playlistId;

    currentPlaylistId =
      playlistId;

    lastTrackRef.current = "";

    try {
      // Stop old playlist
      globalPlayer.stopVideo();

      // Load new playlist
globalPlayer.cuePlaylist({
  list: playlistId,
  listType: "playlist",
  index: 0,
  startSeconds: 0,
});

      console.log(
        "New playlist requested:",
        playlistId
      );
    } catch (error) {
      console.error(
        "Failed to load new playlist:",
        error
      );

      pendingPlaylistRef.current =
        null;
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

export default memo(
  YouTubePlayer
);