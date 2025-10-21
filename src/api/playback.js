/**
 * PlayBack API Service
 * Handles playback settings and audio playback data
 */
import { post } from './client.js'

/**
 * Initialize playback settings for a progression
 */
export function initializeSettings(progressionId) {
  return post('/PlayBack/initializeSettings', { progressionId })
}

/**
 * Set the instrument for a progression's playback
 */
export function setInstrument(progressionId, instrument) {
  return post('/PlayBack/setInstrument', { progressionId, instrument })
}

/**
 * Set the duration (in seconds) for each chord in playback
 */
export function setSecondsPerChord(progressionId, secondsPerChord) {
  return post('/PlayBack/setSecondsPerChord', { progressionId, secondsPerChord })
}

/**
 * Get playback settings for a specific progression
 */
export function getProgressionSettings(progressionId) {
  return post('/PlayBack/getProgressionSettings', { progressionId })
}

/**
 * Get data to play a single chord
 * Returns: { notes, instrument, duration }
 */
export function playChord(progressionId, chord) {
  return post('/PlayBack/playChord', { progressionId, chord })
}

/**
 * Get data to play a sequence of chords
 * Returns: { sequence, instrument }
 */
export function playProgression(progressionId, chordSequence) {
  return post('/PlayBack/playProgression', { progressionId, chordSequence })
}

export default {
  initializeSettings,
  setInstrument,
  setSecondsPerChord,
  getProgressionSettings,
  playChord,
  playProgression,
}
