import { useState } from "react";
import "./PlaylistButton.css";

type PlaylistButtonProps = {
  onPlaylistLoad: (playlistId: string) => void;
};

function PlaylistButton({ onPlaylistLoad }: PlaylistButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const extractPlaylistId = (input: string): string | null => {
    const trimmed = input.trim();

    if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed) && !trimmed.includes("http")) {
      return trimmed;
    }

    const listMatch = trimmed.match(/[?&]list=([A-Za-z0-9_-]+)/);
    if (listMatch) {
      return listMatch[1];
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const playlistId = extractPlaylistId(url);

    if (!playlistId) {
      setError("Invalid playlist URL. Please check and try again.");
      return;
    }

    setIsOpen(false);
    setUrl("");
    onPlaylistLoad(playlistId);
  };

  const handleClose = () => {
    setIsOpen(false);
    setUrl("");
    setError("");
  };

  /* ==========================================
     MUSIC ICON — Reusable SVG
     ========================================== */
  const MusicIcon = ({ size = 28 }: { size?: number }) => (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Musical note with subtle gradient background */}
      <defs>
        <linearGradient id="musicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8a866" />
          <stop offset="100%" stopColor="#d4884a" />
        </linearGradient>
      </defs>

      {/* Rounded background */}
      <circle cx="12" cy="12" r="11" fill="url(#musicGrad)" />

      {/* Musical note */}
      <path
        d="M15.5 6v7.55a3 3 0 1 1-1.5-2.6V8.5l-4 1v6.05a3 3 0 1 1-1.5-2.6V7.5l7-1.5z"
        fill="white"
      />
    </svg>
  );

  return (
    <>
      <button
        type="button"
        className="playlist-button"
        onClick={() => setIsOpen(true)}
        aria-label="Add your playlist"
        title="Add your playlist"
      >
        <MusicIcon size={26} />
        <span className="playlist-button-label">Add Playlist</span>
      </button>

      {isOpen && (
        <div className="playlist-modal-overlay" onClick={handleClose}>
          <div
            className="playlist-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="playlist-modal-title"
          >
            <button
              type="button"
              className="playlist-modal-close"
              onClick={handleClose}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="playlist-modal-header">
              <MusicIcon size={40} />
              <h2 id="playlist-modal-title" className="playlist-modal-title">
                Add Your Playlist
              </h2>
            </div>

            <p className="playlist-modal-description">
              Paste your playlist URL below to start listening:
            </p>

            <form onSubmit={handleSubmit} className="playlist-modal-form">
              <input
                type="text"
                className="playlist-modal-input"
                placeholder="https://youtube.com/playlist?list=..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError("");
                }}
                autoFocus
              />

              {error && <p className="playlist-modal-error">⚠ {error}</p>}

              <div className="playlist-modal-examples">
                <p className="playlist-modal-examples-title">Supported formats:</p>
                <ul>
                  <li>youtube.com/playlist?list=<b>PLxxxxx</b></li>
                  <li>music.youtube.com/playlist?list=<b>PLxxxxx</b></li>
                  <li>Just the playlist ID: <b>PLxxxxx</b></li>
                </ul>
              </div>

              <div className="playlist-modal-actions">
                <button
                  type="button"
                  className="playlist-modal-btn playlist-modal-btn-cancel"
                  onClick={handleClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="playlist-modal-btn playlist-modal-btn-load"
                  disabled={!url.trim()}
                >
                  Load & Insert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default PlaylistButton;