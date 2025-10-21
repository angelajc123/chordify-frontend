/**
 * SuggestChord API Service
 * Handles chord suggestions and preferences
 */
import { post } from './client.js'

/**
 * Initialize suggestion preferences for a progression
 */
export function initializePreferences(progressionId) {
  return post('/SuggestChord/initializePreferences', { progressionId })
}

/**
 * Set the preferred genre for suggestions
 */
export function setPreferredGenre(progressionId, preferredGenre) {
  return post('/SuggestChord/setPreferredGenre', { progressionId, preferredGenre })
}

/**
 * Set the complexity level for suggestions
 */
export function setComplexityLevel(progressionId, complexityLevel) {
  return post('/SuggestChord/setComplexityLevel', { progressionId, complexityLevel })
}

/**
 * Set the musical key for suggestions
 */
export function setKey(progressionId, key) {
  return post('/SuggestChord/setKey', { progressionId, key })
}

/**
 * Get suggestion preferences for a progression
 */
export function getProgressionPreferences(progressionId) {
  return post('/SuggestChord/getProgressionPreferences', { progressionId })
}

/**
 * Get suggested chords for a specific position
 * Returns: { suggestedChords: string[] }
 */
export function suggestChord(progressionId, chords, position) {
  return post('/SuggestChord/suggestChord', { progressionId, chords, position })
}

/**
 * Generate a complete chord progression
 * Returns: { chordSequence: string[] }
 */
export function suggestProgression(progressionId, length) {
  return post('/SuggestChord/suggestProgression', { progressionId, length })
}

export default {
  initializePreferences,
  setPreferredGenre,
  setComplexityLevel,
  setKey,
  getProgressionPreferences,
  suggestChord,
  suggestProgression,
}
