<script setup>
import { ref, onMounted, computed } from 'vue'
import { getPlayBackSettings, setInstrument, setSecondsPerChord } from '../api/playback.js'
import { MIN_SECONDS_PER_CHORD, MAX_SECONDS_PER_CHORD, INSTRUMENTS } from '../shared/constants.js'

const props = defineProps({
  progressionId: {
    type: String,
    required: true
  }
})

const preferences = ref({
  instrument: '',
  secondsPerChord: 0,
})

const isPlaying = ref(false)
const isLooping = ref(false)
const error = ref(null)
const loading = ref(true)
const inputValue = ref('')

// Map INSTRUMENTS constant to dropdown format
const instruments = INSTRUMENTS.map(instrument => ({
  value: instrument,
  label: instrument
}))

const loadPreferences = async () => {
  const response = await getPlayBackSettings(props.progressionId)
  console.log('getPlayBackSettings response:', response)

  if ("error" in response) {
    error.value = response.error
    loading.value = false
    return
  }

  if (response.settings) {
    preferences.value.instrument = response.settings.instrument || 'Piano'
    preferences.value.secondsPerChord = response.settings.secondsPerChord || 2
    inputValue.value = preferences.value.secondsPerChord.toString()
    console.log('Loaded playback settings:', preferences.value)
  }

  loading.value = false
}

const togglePlay = () => {
  isPlaying.value = !isPlaying.value
  // TODO: Implement playback logic
  console.log('Play toggled:', isPlaying.value)
}

const toggleLoop = () => {
  isLooping.value = !isLooping.value
  console.log('Loop toggled:', isLooping.value)
}

const handleInstrumentChange = async (event) => {
  const newInstrument = event.target.value
  preferences.value.instrument = newInstrument
  console.log('Instrument changed:', newInstrument)
  
  const response = await setInstrument(props.progressionId, newInstrument)
  if ("error" in response) {
    error.value = response.error
  }
}

const handleSecondsBlur = () => {
  inputValue.value = preferences.value.secondsPerChord.toString()
}

const handleSecondsChange = async (event) => {
  const inputStr = event.target.value
  inputValue.value = inputStr
  
  if (inputStr === '' || inputStr === '.') {
    return
  }
  
  const value = parseFloat(inputStr)
  
  if (!isNaN(value) && value >= MIN_SECONDS_PER_CHORD && value <= MAX_SECONDS_PER_CHORD) {
    preferences.value.secondsPerChord = value
    console.log('Seconds per chord changed:', preferences.value.secondsPerChord)
    
    const response = await setSecondsPerChord(props.progressionId, value)
    if ("error" in response) {
      error.value = response.error
    }
  } else {
    inputValue.value = preferences.value.secondsPerChord.toString()
  }
}

const incrementSeconds = async () => {
  if (preferences.value.secondsPerChord < MAX_SECONDS_PER_CHORD) {
    preferences.value.secondsPerChord = Math.min(preferences.value.secondsPerChord + 1, MAX_SECONDS_PER_CHORD)
    inputValue.value = preferences.value.secondsPerChord.toString()
    
    const response = await setSecondsPerChord(props.progressionId, preferences.value.secondsPerChord)
    if ("error" in response) {
      error.value = response.error
    }
  }
}

const decrementSeconds = async () => {
  if (preferences.value.secondsPerChord > MIN_SECONDS_PER_CHORD) {
    preferences.value.secondsPerChord = Math.max(preferences.value.secondsPerChord - 1, MIN_SECONDS_PER_CHORD)
    inputValue.value = preferences.value.secondsPerChord.toString()
    
    const response = await setSecondsPerChord(props.progressionId, preferences.value.secondsPerChord)
    if ("error" in response) {
      error.value = response.error
    }
  }
}

onMounted(async () => {
  await loadPreferences()
})
</script>

<template>
  <div class="playback-controls">
    <div v-if="loading" class="loading">
      Loading preferences...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="controls-container">
      <button 
        class="control-btn play-btn" 
        :class="{ 'playing': isPlaying }"
        @click="togglePlay"
        :title="isPlaying ? 'Pause' : 'Play'"
      >
        <svg v-if="!isPlaying" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
      </button>

      <button 
        class="control-btn loop-btn" 
        :class="{ 'active': isLooping }"
        @click="toggleLoop"
        title="Loop"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 2l4 4-4 4"/>
          <path d="M3 11v-1a4 4 0 0 1 4-4h14"/>
          <path d="M7 22l-4-4 4-4"/>
          <path d="M21 13v1a4 4 0 0 1-4 4H3"/>
        </svg>
      </button>

      <div class="control-group">
        <label for="instrument" class="control-label">Instrument:</label>
        <select 
          id="instrument"
          v-model="preferences.instrument"
          @change="handleInstrumentChange"
          class="instrument-select"
        >
          <option v-for="instrument in instruments" :key="instrument.value" :value="instrument.value">
            {{ instrument.label }}
          </option>
        </select>
      </div>

      <div class="control-group">
        <label for="seconds" class="control-label">Seconds/Chord:</label>
        <div class="seconds-control">
          <button class="seconds-btn" @click="decrementSeconds" title="Decrease">−</button>
          <input 
            id="seconds"
            type="text" 
            v-model="inputValue"
            @input="handleSecondsChange"
            @blur="handleSecondsBlur"
            class="seconds-input"
          />
          <button class="seconds-btn" @click="incrementSeconds" title="Increase">+</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playback-controls {
  max-width: 1000px;
  margin: 0 auto 2rem auto;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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

.controls-container {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.control-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid #42b883;
  background: white;
  color: #42b883;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.control-btn:hover {
  background: #42b883;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(66, 184, 131, 0.3);
}

.control-btn.playing,
.control-btn.active {
  background: #42b883;
  color: white;
}

.play-btn {
  width: 60px;
  height: 60px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.control-label {
  font-weight: 600;
  color: #35495e;
  font-size: 0.95rem;
  white-space: nowrap;
}

.instrument-select {
  padding: 0.5rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  color: #35495e;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
}

.instrument-select:hover {
  border-color: #42b883;
}

.instrument-select:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

.seconds-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.seconds-btn {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 2px solid #42b883;
  background: white;
  color: #42b883;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.seconds-btn:hover {
  background: #42b883;
  color: white;
}

.seconds-input {
  width: 70px;
  padding: 0.5rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  text-align: center;
  font-size: 1rem;
  color: #35495e;
  font-weight: 600;
  transition: all 0.2s;
}

.seconds-input:hover {
  border-color: #42b883;
}

.seconds-input:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

/* Remove spinner arrows for number input in some browsers */
.seconds-input::-webkit-outer-spin-button,
.seconds-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

.seconds-input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

@media (max-width: 768px) {
  .controls-container {
    justify-content: center;
  }
  
  .control-group {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
}
</style>
