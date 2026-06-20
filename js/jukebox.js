/**
 * jukebox.js — Tron room background music
 *
 * - Admin sets up to 10 track URLs (.mp3/.ogg) via the Jukebox object modal.
 * - On room join, a random track from the list starts playing automatically.
 * - Mute/unmute is per-device only (NOT synced across users) — each
 *   person's button only affects their own playback, as requested.
 *   Mute preference persists locally (sessionStorage) so it survives
 *   reloads within the same browser tab/session.
 * - When the current track ends, a new random track is picked (can
 *   repeat) so the music keeps going without admin intervention.
 */

import { listenJukeboxTracks } from './firebase.js';

const MUTE_KEY = 'vroom_jukebox_muted';

let _tracks = [];
let _audioEl = null;
let _muted = sessionStorage.getItem(MUTE_KEY) === '1';
let _currentIndex = -1;
let _hasStartedPlayback = false;
let _onStateChange = null; // callback(track|null, muted) — for UI updates (header icon, jukebox screen text)

function _pickRandomIndex(excludeIndex = -1) {
  if (_tracks.length === 0) return -1;
  if (_tracks.length === 1) return 0;
  let idx;
  do { idx = Math.floor(Math.random() * _tracks.length); } while (idx === excludeIndex);
  return idx;
}

function _notify() {
  const track = _currentIndex >= 0 ? _tracks[_currentIndex] : null;
  _onStateChange?.(track, _muted);
}

function _playIndex(idx) {
  if (idx < 0 || !_audioEl) return;
  _currentIndex = idx;
  const track = _tracks[idx];
  _audioEl.src = track.url;
  _audioEl.muted = _muted;
  _audioEl.play().catch(() => {
    // Autoplay can be blocked until the user interacts with the page —
    // browsers require a user gesture. We retry on the next click.
    const retry = () => { _audioEl.play().catch(() => {}); document.removeEventListener('click', retry); };
    document.addEventListener('click', retry, { once: true });
  });
  _notify();
}

function _playRandom() {
  const idx = _pickRandomIndex(_currentIndex);
  if (idx >= 0) _playIndex(idx);
}

/**
 * Call once at boot with the <audio> element and a state-change callback.
 * Starts listening for the admin-managed track list and autoplays a
 * random track as soon as tracks are available.
 */
export function initJukebox(audioEl, onStateChange) {
  _audioEl = audioEl;
  _onStateChange = onStateChange;
  _audioEl.muted = _muted;

  _audioEl.addEventListener('ended', () => _playRandom());

  listenJukeboxTracks((tracks) => {
    _tracks = Array.isArray(tracks) ? tracks.filter(t => t && t.url) : [];
    if (_tracks.length === 0) {
      _audioEl.pause();
      _currentIndex = -1;
      _notify();
      return;
    }
    if (!_hasStartedPlayback) {
      _hasStartedPlayback = true;
      _playRandom();
    } else if (_currentIndex >= _tracks.length) {
      // current track no longer exists (list shrank) — pick a new one
      _playRandom();
    }
  });

  _notify();
}

export function toggleMute() {
  _muted = !_muted;
  sessionStorage.setItem(MUTE_KEY, _muted ? '1' : '0');
  if (_audioEl) _audioEl.muted = _muted;
  _notify();
  return _muted;
}

export function isMuted() { return _muted; }
export function getCurrentTrack() { return _currentIndex >= 0 ? _tracks[_currentIndex] : null; }
export function getTracks() { return _tracks; }

/** Re-fire the state-change callback (used after the room visuals are
 *  (re)built, so the in-world jukebox screen picks up the current track
 *  even if playback started before the Phaser scene existed). */
export function resyncState() { _notify(); }

/** Skip to a new random track immediately (used by the jukebox modal's "next" button). */
export function skipTrack() { _playRandom(); }
