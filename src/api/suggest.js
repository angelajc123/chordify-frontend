import { post } from './client.js'

export function initializePreferences(progressionId) {
  return post('/SuggestChord/initializePreferences', { progressionId })
}

export function setGenre(progressionId, genre) {
  return post('/SuggestChord/setGenre', { progressionId, genre })
}

export function setComplexity(progressionId, complexity) {
  return post('/SuggestChord/setComplexity', { progressionId, complexity })
}

export function setKey(progressionId, key) {
  return post('/SuggestChord/setKey', { progressionId, key })
}

export function getSuggestionPreferences(progressionId) {
  return post('/SuggestChord/getSuggestionPreferences', { progressionId })
}

export function suggestChord(progressionId, chords, position) {
  return post('/SuggestChord/suggestChord', { progressionId, chords, position })
}

export function suggestProgression(progressionId, length) {
  return post('/SuggestChord/suggestProgression', { progressionId, length })
}

export default {
  initializePreferences,
  setGenre,
  setComplexity,
  setKey,
  getSuggestionPreferences,
  suggestChord,
  suggestProgression,
}
