<script setup>
import { ref, onMounted } from 'vue'
import { getSuggestionPreferences, setKey, setGenre, setComplexity, suggestChord } from '../api/suggest.js'
import { setChord } from '../api/progression.js'
import { GENRES, COMPLEXITY_LEVELS, NUM_SUGGESTIONS } from '../shared/constants.js'

const emit = defineEmits(['chordUpdated'])

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
    return
  }
  
  generating.value = true
  error.value = null
  
  // Convert chords array to the format expected by the API
  const chordsArray = props.chords.map(c => c.chord)
  
  const response = await suggestChord(props.progressionId, chordsArray, props.selectedSlot)
  console.log('suggestChord response:', response)
  
  if ("error" in response) {
    error.value = response.error
    generating.value = false
    return
  }
  
  if (response.suggestedChords) {
    suggestedChords.value = response.suggestedChords
  }
  
  generating.value = false
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
    
    <!-- Generate Chord Button -->
    <button class="generate-btn" @click="handleGenerateChord" :disabled="generating">
      {{ generating ? 'Generating...' : 'Generate Chord' }}
    </button>
    
    <!-- Suggestion Grid -->
    <div class="suggestion-grid">
      <div 
        v-for="(chord, index) in NUM_SUGGESTIONS" 
        :key="index" 
        class="suggestion-box"
        :class="{ 'suggestion-box-clickable': suggestedChords[index] }"
        @click="handleChordClick(suggestedChords[index])"
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
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.loading,
.error {
  text-align: center;
  padding: 1rem;
  font-size: 1rem;
}

.loading {
  color: #42b883;
}

.error {
  color: #e74c3c;
}

.preferences-header {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  color: #35495e;
  font-weight: 600;
  text-align: center;
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
  font-weight: 600;
  color: #35495e;
  font-size: 0.95rem;
}

.preference-select {
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 1rem;
  background: white;
  color: #35495e;
  cursor: pointer;
  transition: all 0.2s;
}

.preference-select:hover {
  border-color: #42b883;
}

.preference-select:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

.generate-btn {
  width: auto;
  margin: 2rem auto 0;
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #42b883 0%, #35495e 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: block;
}

.generate-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.3);
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
  background: #fafafa;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #35495e;
  transition: all 0.2s;
  font-size: 1.2rem;
}

.suggestion-box:hover {
  background: #f5f5f5;
  border-color: #42b883;
}

.suggestion-box-clickable {
  cursor: pointer;
  background: #42b883;
  color: white;
}

.suggestion-box-clickable:hover {
  background: #35495e;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(66, 184, 131, 0.3);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .suggestion-box {
    height: 60px;
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .suggestion-box {
    height: 50px;
    font-size: 0.9rem;
  }
}
</style>
