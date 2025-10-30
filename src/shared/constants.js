// Shared constants and functions for frontend and backend validation
import { Chord, Key } from "tonal";

// PlayBack constants
export const INSTRUMENTS = ["Piano", "Guitar", "Synthesizer"];
export const MIN_SECONDS_PER_CHORD = 1;
export const MAX_SECONDS_PER_CHORD = 10;

// SuggestChord constants
export const NUM_SUGGESTIONS = 24;
export const NUM_PROGESSION_SUGGESTIONS = 3;
export const GENRES = ["Pop", "Rock", "Jazz", "Classical", "Hip hop", "R&B", "Country", "Electronic"];
export const COMPLEXITY_LEVELS = ["Simple", "Intermediate", "Advanced"];

export function isValidChord(chord) {
  return !Chord.get(chord).empty;
}

export function isValidKey(key) {
  return Key.majorKey(key).tonic != "" || Key.minorKey(key).tonic != "";
}