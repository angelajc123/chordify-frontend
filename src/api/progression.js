import { post } from './client.js'

export function createProgression(name) {
  return post('/ProgressionBuilder/createProgression', { name })
}

export function addSlot(progressionId) {
  return post('/ProgressionBuilder/addSlot', { progressionId })
}

export function setChord(progressionId, position, chord) {
  return post('/ProgressionBuilder/setChord', { progressionId, position, chord })
}

export function deleteChord(progressionId, position) {
  return post('/ProgressionBuilder/deleteChord', { progressionId, position })
}

export function deleteSlot(progressionId, position) {
  return post('/ProgressionBuilder/deleteSlot', { progressionId, position })
}

export function reorderSlots(progressionId, oldPosition, newPosition) {
  return post('/ProgressionBuilder/reorderSlots', { progressionId, oldPosition, newPosition })
}

export function deleteProgression(progressionId) {
  return post('/ProgressionBuilder/deleteProgression', { progressionId })
}

export function renameProgression(progressionId, name) {
  return post('/ProgressionBuilder/renameProgression', { progressionId, name })
}

export function getProgression(progressionId) {
  return post('/ProgressionBuilder/getProgression', { progressionId })
}

export function listProgressions() {
  return post('/ProgressionBuilder/listProgressions', {})
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
