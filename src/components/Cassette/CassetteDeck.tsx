import { useRef, useEffect } from "react";
import spinVideo from "../../assets/deck/cassette/cassette-spin.mp4";
import ffVideo from "../../assets/deck/cassette/cassette-spin-ff.mp4";
import rewindVideo from "../../assets/deck/cassette/cassette-spin-rw.mp4";
import stillImage from "../../assets/deck/cassette/cassette-still.png";

type PlaybackState =
  | "stopped"
  | "playing"
  | "paused"
  | "buffering"
  | "fastForward"
  | "rewinding";

type CassetteProps = {
  playbackState: PlaybackState;
};

function Cassette({ playbackState }: CassetteProps) {
  const spinRef = useRef<HTMLVideoElement>(null);
  const ffRef = useRef<HTMLVideoElement>(null);
  const rewindRef = useRef<HTMLVideoElement>(null);

  // Determine which video should be active
  const isSpinActive =
    playbackState === "playing" || playbackState === "buffering";
  const isFFActive = playbackState === "fastForward";
  const isRewindActive = playbackState === "rewinding";

  // Play/pause the RIGHT video based on state
  useEffect(() => {
    const spin = spinRef.current;
    const ff = ffRef.current;
    const rw = rewindRef.current;

    // Pause all videos first
    [spin, ff, rw].forEach((v) => {
      if (v && !v.paused) v.pause();
    });

    // Play only the active one
    if (isSpinActive && spin) {
      spin.play().catch(() => {});
    } else if (isFFActive && ff) {
      ff.play().catch(() => {});
    } else if (isRewindActive && rw) {
      rw.play().catch(() => {});
    }
  }, [playbackState, isSpinActive, isFFActive, isRewindActive]);

  return (
    <div className={`deck-cassette-slot ${playbackState}`}>
      {/* Static PNG — always underneath, shows when nothing is active */}
      <img
        src={stillImage}
        alt=""
        className="deck-cassette-still"
        draggable={false}
      />

      {/* SPIN video */}
      <video
        ref={spinRef}
        src={spinVideo}
        className={`deck-cassette-video deck-cassette-spin ${
          isSpinActive ? "active" : ""
        }`}
        loop
        muted
        playsInline
        preload="auto"
      />

      {/* FAST FORWARD video */}
      <video
        ref={ffRef}
        src={ffVideo}
        className={`deck-cassette-video deck-cassette-ff ${
          isFFActive ? "active" : ""
        }`}
        loop
        muted
        playsInline
        preload="auto"
      />

      {/* REWIND video */}
      <video
        ref={rewindRef}
        src={rewindVideo}
        className={`deck-cassette-video deck-cassette-rw ${
          isRewindActive ? "active" : ""
        }`}
        loop
        muted
        playsInline
        preload="auto"
      />
    </div>
  );
}

export default Cassette;