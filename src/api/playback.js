import { post } from './client.js'

export function initializeSettings(progressionId) {
  return post('/PlayBack/initializeSettings', { progressionId })
}

export function setInstrument(progressionId, instrument) {
  return post('/PlayBack/setInstrument', { progressionId, instrument })
}

export function setSecondsPerChord(progressionId, secondsPerChord) {
  return post('/PlayBack/setSecondsPerChord', { progressionId, secondsPerChord })
}

export function getPlayBackSettings(progressionId) {
  return post('/PlayBack/getPlayBackSettings', { progressionId })
}

export function getChordNotes(chord) {
  return post('/PlayBack/getChordNotes', { chord })
}

export function getProgressionNotes(progression) {
  return post('/PlayBack/getProgressionNotes', { progression })
}

export function deleteSettings(progressionId) {
  return post('/PlayBack/deleteSettings', { progressionId })
}

export default {
  initializeSettings,
  setInstrument,
  setSecondsPerChord,
  getPlayBackSettings,
  getChordNotes,
  getProgressionNotes,
}
