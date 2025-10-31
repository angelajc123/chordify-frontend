<script setup>
import { ref, onMounted } from 'vue'
import { getSuggestionPreferences, setKey, setGenre, setComplexity, suggestChord, suggestProgression } from '../api/suggest.js'
import { setChord } from '../api/progression.js'
import { GENRES, COMPLEXITY_LEVELS, NUM_SUGGESTIONS, NUM_PROGESSION_SUGGESTIONS } from '../shared/constants.js'

const emit = defineEmits(['chordUpdated', 'error'])

const props = defineProps({
  progressionId: {
    type: String,
    required: true
  },
  selectedSlot: {
    type: Number,
    default: null
  },
  chords: {
    type: Array,
    required: true
  },
  playbackControls: {
    type: Object,
    default: null
  },
  onUseProgression: {
    type: Function,
    default: null
  }
})

const preferences = ref({
  key: '',
  genre: '',
  complexity: ''
})

const error = ref(null)
const loading = ref(true)
const suggestedChords = ref([])
const generating = ref(false)
const suggestedProgressions = ref([])
const generatingProgressions = ref(false)
const playingProgressionIndex = ref(null)
let progressionPlaybackTimeout = null

// Key options (not in shared constants as they're frontend-specific)
const KEY_OPTIONS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm'
]

const loadPreferences = async () => {
  const response = await getSuggestionPreferences(props.progressionId)
  console.log('getSuggestionPreferences response:', response)
  console.log('preferences:', response.preferences)
  
  if ("error" in response) {
    error.value = response.error
    loading.value = false
    return
  }
  
  if (response.preferences) {
    preferences.value.key = response.preferences.key || ''
    preferences.value.genre = response.preferences.genre || ''
    preferences.value.complexity = response.preferences.complexity || ''
    
    console.log('Loaded preferences:', preferences.value)
  }
  
  loading.value = false
}

const handleKeyChange = async (event) => {
  const newKey = event.target.value
  event.target.blur() // Unselect the dropdown
  const response = await setKey(props.progressionId, newKey)
  
  if ("error" in response) {
    error.value = response.error
    return
  }
  
  preferences.value.key = newKey
  console.log('Key updated to:', newKey)
}

const handleGenreChange = async (event) => {
  const newGenre = event.target.value
  event.target.blur() // Unselect the dropdown
  const response = await setGenre(props.progressionId, newGenre)
  
  if ("error" in response) {
    error.value = response.error
    return
  }
  
  preferences.value.genre = newGenre
  console.log('Genre updated to:', newGenre)
}

const handleComplexityChange = async (event) => {
  const newComplexity = event.target.value
  event.target.blur() // Unselect the dropdown
  const response = await setComplexity(props.progressionId, newComplexity)
  
  if ("error" in response) {
    error.value = response.error
    return
  }
  
  preferences.value.complexity = newComplexity
  console.log('Complexity updated to:', newComplexity)
}

const handleGenerateChord = async () => {
  if (props.selectedSlot === null) {
    emit('error', 'Please select a chord slot first')
    return
  }
  
  generating.value = true
  error.value = null
  
  // Clear progression suggestions to switch back to chord view
  suggestedProgressions.value = []
  
  // Convert chords array to the format expected by the API
  const chordsArray = props.chords.map(c => c.chord)
  
  const response = await suggestChord(props.progressionId, chordsArray, props.selectedSlot)
  console.log('suggestChord response:', response)
  
  if ("error" in response) {
    emit('error', response.error)
    generating.value = false
    return
  }
  
  if (response.suggestedChords) {
    suggestedChords.value = response.suggestedChords
  }
  
  generating.value = false
}

const handleChordSingleClick = async (chord) => {
  if (!chord) return
  
  // Play the chord using PlaybackControls
  if (props.playbackControls) {
    props.playbackControls.playSuggestedChord(chord)
  }
}

const handleChordClick = async (chord) => {
  if (!chord || props.selectedSlot === null) {
    return
  }
  
  const response = await setChord(props.progressionId, props.selectedSlot, chord)
  console.log('setChord response:', response)
  
  if ("error" in response) {
    error.value = response.error
    return
  }
  
  // Emit event to parent to reload progression
  emit('chordUpdated')
}

const handleGenerateProgression = async () => {
  generatingProgressions.value = true
  error.value = null
  
  const length = props.chords.length
  
  if (length === 0) {
    emit('error', 'Please add chord slots before generating a progression')
    generatingProgressions.value = false
    return
  }
  
  const response = await suggestProgression(props.progressionId, length)
  console.log('suggestProgression response:', response)
  
  if ("error" in response) {
    emit('error', response.error)
    generatingProgressions.value = false
    return
  }
  
  if (response.suggestedProgressions) {
    suggestedProgressions.value = response.suggestedProgressions
  }
  
  generatingProgressions.value = false
}

const handlePlayProgression = async (progressionIndex) => {
  const progression = suggestedProgressions.value[progressionIndex]
  if (!progression || !props.playbackControls) return
  
  // If this progression is already playing, stop it
  if (playingProgressionIndex.value === progressionIndex) {
    playingProgressionIndex.value = null
    
    // Clear the timeout
    if (progressionPlaybackTimeout) {
      clearTimeout(progressionPlaybackTimeout)
      progressionPlaybackTimeout = null
    }
    
    // Stop the audio playback
    if (props.playbackControls?.stopProgressionPlayback) {
      props.playbackControls.stopProgressionPlayback()
    }
    
    console.log('Progression playback stopped')
    return
  }
  
  // Stop any currently playing progression
  if (progressionPlaybackTimeout) {
    clearTimeout(progressionPlaybackTimeout)
    progressionPlaybackTimeout = null
  }
  
  playingProgressionIndex.value = progressionIndex
  
  // Use PlaybackControls to play the progression
  await props.playbackControls.playProgressionSequence(progression)
  
  // Calculate total duration and set timeout to reset playing state
  const secondsPerChord = props.playbackControls.preferences?.secondsPerChord || 1
  const totalDuration = progression.length * secondsPerChord * 1000
  progressionPlaybackTimeout = setTimeout(() => {
    playingProgressionIndex.value = null
    progressionPlaybackTimeout = null
  }, totalDuration)
}

const handleUseProgression = async (progressionIndex) => {
  const progression = suggestedProgressions.value[progressionIndex]
  if (!progression) return
  
  // Use the parent's function if provided
  if (props.onUseProgression) {
    await props.onUseProgression(progression)
  }
}

onMounted(async () => {
  await loadPreferences()
})
</script>

<template>
  <div class="chord-suggestion">
    <div v-if="loading" class="loading">
      Loading preferences...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else>
      <h3 class="preferences-header">Suggestion Preferences</h3>
      <div class="preferences-container">
      <div class="preference-item">
        <label for="key-select">Key</label>
        <select 
          id="key-select" 
          v-model="preferences.key" 
          @change="handleKeyChange"
          class="preference-select"
        >
          <option v-for="key in KEY_OPTIONS" :key="key" :value="key">
            {{ key }}
          </option>
        </select>
      </div>
      
      <div class="preference-item">
        <label for="genre-select">Genre</label>
        <select 
          id="genre-select" 
          v-model="preferences.genre" 
          @change="handleGenreChange"
          class="preference-select"
        >
          <option v-for="genre in GENRES" :key="genre" :value="genre">
            {{ genre }}
          </option>
        </select>
      </div>
      
      <div class="preference-item">
        <label for="complexity-select">Complexity</label>
        <select 
          id="complexity-select" 
          v-model="preferences.complexity" 
          @change="handleComplexityChange"
          class="preference-select"
        >
          <option v-for="complexity in COMPLEXITY_LEVELS" :key="complexity" :value="complexity">
            {{ complexity }}
          </option>
        </select>
      </div>
    </div>
    
    <!-- Generate Buttons -->
    <div class="button-container">
      <button class="generate-btn" @click="handleGenerateChord" :disabled="generating">
        {{ generating ? 'Generating...' : 'Generate Chord' }}
      </button>
      <button class="generate-btn" @click="handleGenerateProgression" :disabled="generatingProgressions">
        {{ generatingProgressions ? 'Generating...' : 'Generate Progression' }}
      </button>
    </div>
    
    <!-- Progression Suggestions -->
    <div v-if="suggestedProgressions.length > 0" class="progression-suggestions">
      <div 
        v-for="(progression, pIndex) in suggestedProgressions" 
        :key="pIndex" 
        class="progression-row"
      >
        <div class="progression-chords">
          <div 
            v-for="(chord, cIndex) in progression" 
            :key="cIndex" 
            class="progression-chord-box"
          >
            {{ chord }}
          </div>
        </div>
        <div class="progression-actions">
          <button 
            class="progression-action-btn play-btn" 
            :class="{ 'playing': playingProgressionIndex === pIndex }"
            @click="handlePlayProgression(pIndex)"
            :title="playingProgressionIndex === pIndex ? 'Stop' : 'Play'"
          >
            <svg v-if="playingProgressionIndex !== pIndex" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          </button>
          <button 
            class="progression-action-btn use-btn" 
            @click="handleUseProgression(pIndex)"
            title="Use"
          >
            Use
          </button>
        </div>
      </div>
    </div>

    <!-- Suggestion Grid -->
    <div v-else class="suggestion-grid">
      <div 
        v-for="(chord, index) in NUM_SUGGESTIONS" 
        :key="index" 
        class="suggestion-box"
        :class="{ 'suggestion-box-clickable': suggestedChords[index] }"
        @click="handleChordSingleClick(suggestedChords[index])"
        @dblclick="handleChordClick(suggestedChords[index])"
      >
        {{ suggestedChords[index] || '' }}
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
.chord-suggestion {
  max-width: 1000px;
  margin: 2rem auto 0;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(15, 21, 53, 0.8) 0%, rgba(10, 14, 39, 0.8) 100%);
  border-radius: 12px;
  border: 2px solid rgba(139, 92, 246, 0.5);
  box-shadow: 0 0 30px rgba(139, 92, 246, 0.4), 0 0 60px rgba(255, 0, 110, 0.2);
  backdrop-filter: blur(20px);
}

.loading,
.error {
  text-align: center;
  padding: 1rem;
  font-size: 1rem;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.loading {
  color: #00d9ff;
  text-shadow: 0 0 10px rgba(0, 217, 255, 0.5);
}

.error {
  color: #ff006e;
  text-shadow: 0 0 10px rgba(255, 0, 110, 0.5);
}

.preferences-header {
  margin: 0 0 1.5rem 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  color: #00d9ff;
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-shadow: 0 0 15px rgba(0, 217, 255, 0.6);
}

.preferences-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.preference-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preference-item label {
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  color: #00d9ff;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-shadow: 0 0 10px rgba(0, 217, 255, 0.4);
}

.preference-select {
  padding: 0.75rem 2rem 0.75rem 0.75rem;
  border: 2px solid #8b5cf6;
  border-radius: 6px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  font-weight: 500;
  background: rgba(15, 21, 53, 0.8);
  color: #e0e7ff;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2300d9ff' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}

.preference-select:hover {
  border-color: #00d9ff;
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.4);
}

.preference-select:focus {
  outline: none;
  border-color: #ff006e;
  box-shadow: 0 0 25px rgba(255, 0, 110, 0.5);
}

.button-container {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.generate-btn {
  width: auto;
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #ff006e 0%, #8b5cf6 100%);
  color: white;
  border: 2px solid rgba(255, 0, 110, 0.5);
  border-radius: 8px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 0 20px rgba(255, 0, 110, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.generate-btn:hover {
  background: linear-gradient(135deg, #8b5cf6 0%, #00d9ff 100%);
  border-color: #00d9ff;
  transform: translateY(-2px);
  box-shadow: 0 0 30px rgba(0, 217, 255, 0.7);
}

.generate-btn:active {
  transform: translateY(0);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.suggestion-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 1.0rem 0.5rem;
  margin-top: 1.5rem;
}

.suggestion-box {
  width: 100%;
  min-width: 60px;
  height: 80px;
  background: rgba(15, 21, 53, 0.6);
  border: 2px solid rgba(139, 92, 246, 0.4);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Share Tech Mono', monospace;
  font-weight: bold;
  color: #94a3b8;
  transition: all 0.3s;
  font-size: 1.2rem;
  user-select: none;
  backdrop-filter: blur(10px);
}

.suggestion-box:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: #8b5cf6;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
}

.suggestion-box-clickable {
  cursor: pointer;
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  border-color: #8b5cf6;
  color: white;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.5);
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.suggestion-box-clickable:hover {
  background: linear-gradient(135deg, #ff006e 0%, #8b5cf6 100%);
  border-color: #ff006e;
  transform: translateY(-2px);
  box-shadow: 0 0 25px rgba(255, 0, 110, 0.6), 0 0 40px rgba(139, 92, 246, 0.4);
}

/* Progression Suggestions */
.progression-suggestions {
  margin-top: 1.5rem;
}

.progression-header {
  margin: 0 0 1.5rem 0;
  font-size: 1.3rem;
  color: #35495e;
  font-weight: 600;
  text-align: center;
}

.progression-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(15, 21, 53, 0.6);
  border-radius: 8px;
  border: 2px solid rgba(139, 92, 246, 0.4);
  transition: all 0.3s;
  backdrop-filter: blur(10px);
}

.progression-row:hover {
  border-color: #00d9ff;
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.4);
  background: rgba(139, 92, 246, 0.1);
}

.progression-chords {
  display: flex;
  gap: 0.5rem;
  flex: 1;
  flex-wrap: wrap;
}

.progression-chord-box {
  width: 80px;
  height: 50px;
  padding: 0.5rem;
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  border: 2px solid rgba(139, 92, 246, 0.5);
  color: white;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Share Tech Mono', monospace;
  font-weight: bold;
  font-size: 1rem;
  user-select: none;
  flex-shrink: 0;
  box-shadow: 0 0 10px rgba(139, 92, 246, 0.4);
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
}

.progression-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.progression-action-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.progression-action-btn.play-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #8b5cf6;
  background: rgba(15, 21, 53, 0.6);
  color: #00d9ff;
  padding: 0;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
}

.progression-action-btn.play-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  border-color: #00d9ff;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 0 25px rgba(0, 217, 255, 0.6);
}

.progression-action-btn.play-btn.playing {
  background: linear-gradient(135deg, #ff006e 0%, #8b5cf6 100%);
  border-color: #ff006e;
  color: white;
  box-shadow: 0 0 25px rgba(255, 0, 110, 0.6);
}

.progression-action-btn.use-btn {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  border: 2px solid #8b5cf6;
  color: white;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
}

.progression-action-btn.use-btn:hover {
  background: linear-gradient(135deg, #ff006e 0%, #8b5cf6 100%);
  border-color: #ff006e;
  transform: translateY(-2px);
  box-shadow: 0 0 25px rgba(255, 0, 110, 0.6);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .suggestion-box {
    height: 60px;
    font-size: 1rem;
  }
  
  .progression-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .progression-actions {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .suggestion-box {
    height: 50px;
    font-size: 0.9rem;
  }
  
  .progression-chord-box {
    width: 60px;
    height: 40px;
    font-size: 0.9rem;
  }
}
</style>
