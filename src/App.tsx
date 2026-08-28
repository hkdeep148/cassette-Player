import { useCallback, useEffect, useRef, useState } from "react";

import "./styles/global.css";
import "./styles/deck.css";
import "./styles/animations.css";

import CassetteDeck from "./components/CassetteDeck/CassetteDeck";
import YouTubePlayer from "./components/YouTubePlayer/YouTubePlayer";
import PlaylistButton from "./components/PlaylistButton/PlaylistButton";

const DEFAULT_PLAYLIST_ID = "PLGHib2TB_9EKlIotL4ShkJOmqMVPPzvha";

function App() {
  const [youtubePlayer, setYoutubePlayer] = useState<any>(null);

  const [currentTrack, setCurrentTrack] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [youtubeState, setYoutubeState] = useState<number>(-1);

  const [playlistId, setPlaylistId] = useState<string>(() => {
    return (
      localStorage.getItem("cassette-playlist-id") || DEFAULT_PLAYLIST_ID
    );
  });

  const [isSwappingCassette, setIsSwappingCassette] = useState(false);

const deckActionsRef = useRef<{
  openLid: () => void;
  openLidInstantly: () => void;
  closeLid: () => void;
  showLoading: () => void;
  showSwapping: () => void;
  triggerPlay: () => void; // ← NEW
  isLidOpen: () => boolean;
} | null>(null);

  const pendingAutoPlayRef = useRef(false);

  useEffect(() => {
    const preventCtrlWheelZoom = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault();
    };
    window.addEventListener("wheel", preventCtrlWheelZoom, { passive: false });
    return () => window.removeEventListener("wheel", preventCtrlWheelZoom);
  }, []);

  const handlePlayerReady = useCallback((player: any) => {
    setYoutubePlayer(player);
  }, []);

  const handleTrackChange = useCallback((track: string) => {
    setCurrentTrack(track);
  }, []);

  const handleProgress = useCallback((time: number, total: number) => {
    setCurrentTime(time);
    setDuration(total);
  }, []);


  /* ==========================================
     PLAYLIST LOAD — INSTANT CLOSING ANIMATION
     ========================================== */

  const handlePlaylistLoad = useCallback(
    (newPlaylistId: string) => {
      // Save preference
      localStorage.setItem("cassette-playlist-id", newPlaylistId);

      // Pause current music silently
      if (youtubePlayer) {
        try {
          youtubePlayer.pauseVideo();
        } catch {}
      }

      // Reset track info
      setCurrentTrack("");
      setCurrentTime(0);
      setDuration(0);

      // Load new playlist into YouTube (happens in background)
      setPlaylistId(newPlaylistId);

      // Mark swapping so cassette hides
      setIsSwappingCassette(true);
      pendingAutoPlayRef.current = true;

      // Set lid to "open" instantly, then close immediately
      if (deckActionsRef.current) {
        deckActionsRef.current.showSwapping();
        deckActionsRef.current.openLidInstantly();

        // Trigger closing animation on next frame
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (deckActionsRef.current) {
              deckActionsRef.current.closeLid();
            }
          });
        });
      }
    },
    [youtubePlayer]
  );


  /* ==========================================
     LID CLOSED AFTER SWAP → AUTO-PLAY
     ========================================== */

const handleLidClosedAfterSwap = useCallback(() => {
  setIsSwappingCassette(false);

  if (!pendingAutoPlayRef.current) return;
  pendingAutoPlayRef.current = false;

  setTimeout(() => {
    if (deckActionsRef.current) {
      deckActionsRef.current.showLoading();
    }

    setTimeout(() => {
      // ⭐ Use triggerPlay instead of direct playVideo
      // This sets playMode="playing" AND plays YouTube
      if (deckActionsRef.current) {
        deckActionsRef.current.triggerPlay();
      }
    }, 800);
  }, 300);
}, []); // ← remove youtubePlayer dependency


  return (
    <main className="room">
      <PlaylistButton onPlaylistLoad={handlePlaylistLoad} />

      <CassetteDeck
        youtubePlayer={youtubePlayer}
        currentTrack={currentTrack}
        currentTime={currentTime}
        duration={duration}
        youtubeState={youtubeState}
        deckActionsRef={deckActionsRef}
        onLidClosedAfterPlaylistSwap={handleLidClosedAfterSwap}
        isSwappingPlaylist={isSwappingCassette}
      />

      <YouTubePlayer
        playlistId={playlistId}
        onReady={handlePlayerReady}
        onTrackChange={handleTrackChange}
        onProgress={handleProgress}
        onPlaybackStateChange={setYoutubeState}
      />
    </main>
  );
}

export default App;