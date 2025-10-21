/**
 * ProgressionBuilder API Service
 * Handles chord progression creation and management
 */
import { post } from './client.js'

/**
 * Create a new, empty progression
 */
export function createProgression(name) {
  return post('/ProgressionBuilder/createProgression', { name })
}

/**
 * Add an empty slot to a progression
 */
export function addSlot(progressionId) {
  return post('/ProgressionBuilder/addSlot', { progressionId })
}

/**
 * Set the chord at a specific position in the progression
 */
export function setChord(progressionId, position, chord) {
  return post('/ProgressionBuilder/setChord', { progressionId, position, chord })
}

/**
 * Delete a chord (set to null) at a specific position
 */
export function deleteChord(progressionId, position) {
  return post('/ProgressionBuilder/deleteChord', { progressionId, position })
}

/**
 * Remove a slot entirely from the progression
 */
export function deleteSlot(progressionId, position) {
  return post('/ProgressionBuilder/deleteSlot', { progressionId, position })
}

/**
 * Reorder slots within a progression
 */
export function reorderSlots(progressionId, oldPosition, newPosition) {
  return post('/ProgressionBuilder/reorderSlots', { progressionId, oldPosition, newPosition })
}

/**
 * Delete an entire progression
 */
export function deleteProgression(progressionId) {
  return post('/ProgressionBuilder/deleteProgression', { progressionId })
}

/**
 * Rename a progression
 */
export function renameProgression(progressionId, name) {
  return post('/ProgressionBuilder/renameProgression', { progressionId, name })
}

/**
 * Get a specific progression by ID
 * Returns array with single progression object
 */
export function getProgression(progressionId) {
  return post('/ProgressionBuilder/_getProgression', { progressionId })
}

/**
 * List all progressions (IDs and names)
 * Returns array with progressionIdentifiers
 */
export function listProgressions() {
  return post('/ProgressionBuilder/_listProgressions', {})
}

export default {
  createProgression,
  addSlot,
  setChord,
  deleteChord,
  deleteSlot,
  reorderSlots,
  deleteProgression,
  renameProgression,
  getProgression,
  listProgressions,
}
