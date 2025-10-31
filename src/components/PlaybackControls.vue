<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { getPlayBackSettings, getProgressionNotes, setInstrument, setSecondsPerChord } from '../api/playback.js'
import { MIN_SECONDS_PER_CHORD, MAX_SECONDS_PER_CHORD, INSTRUMENTS } from '../shared/constants.js'
import * as Tone from 'tone'

const props = defineProps({
  progressionId: {
    type: String,
    required: true
  },
  chords: {
    type: Array,
    required: true
  },
  selectedSlot: {
    type: Number,
    default: null
  }
})

const preferences = ref({
  instrument: '',
  secondsPerChord: 0,
})

const synths = {
  Piano: function() {
    // return new Tone.Piano().toDestination()
    // return new Tone.Sampler({
    //   urls: {
    //     C4: "C4.mp3",
    //     E4: "E4.mp3",
    //     G4: "G4.mp3",
    //   },
    //   release: 1,
    //   baseUrl: "https://tonejs.github.io/audio/salamander/"
    // }).toDestination();
    return new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 8,
      modulationIndex: 2,
      envelope: {
        attack: 0.001,
        decay: 2,
        sustain: 0.1,
        release: 2
      },
      modulation: {
        type: "square"
      },
      modulationEnvelope: {
        attack: 0.002,
        decay: 0.2,
        sustain: 0,
        release: 0.2
      }
    }).toDestination()
  },
  Guitar: function() {
    return new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 8,
      modulationIndex: 2,
      envelope: {
        attack: 0.001,
        decay: 2,
        sustain: 0.1,
        release: 2
      },
      modulation: {
        type: "square"
      },
      modulationEnvelope: {
        attack: 0.002,
        decay: 0.2,
        sustain: 0,
        release: 0.2
      }
    }).toDestination()
  },
  Synthesizer: function() {
    return new Tone.PolySynth(Tone.AMSynth).toDestination()
  }
}

const isPlaying = ref(false)
const isLooping = ref(false)
const error = ref(null)
const loading = ref(true)
const inputValue = ref('')
let currentSynth = null
let playbackTimeout = null
let selectionSynth = null

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
    preferences.value.secondsPerChord = response.settings.secondsPerChord || 1
    inputValue.value = preferences.value.secondsPerChord.toString()
    console.log('Loaded playback settings:', preferences.value)
  }

  loading.value = false
}

const createSynth = () => {
  return synths[preferences.value.instrument]()
}

const playProgression = async () => {
  const chords = props.chords.map(chord => chord.chord)
  await playProgressionSequence(chords, true)
}

const togglePlay = async () => {
  // If already playing, stop playback
  if (isPlaying.value) {
    isPlaying.value = false
    
    // Clear the timeout
    if (playbackTimeout) {
      clearTimeout(playbackTimeout)
      playbackTimeout = null
    }
    
    // Stop and dispose of the synth
    if (currentSynth) {
      currentSynth.releaseAll()
      currentSynth.dispose()
      currentSynth = null
    }
    
    console.log('Playback stopped')
    return
  }

  // Stop any selection synth when starting playback
  if (selectionSynth) {
    selectionSynth.releaseAll()
    selectionSynth.dispose()
    selectionSynth = null
  }

  // Start playback
  isPlaying.value = true
  await playProgression()
  
  console.log('Play toggled:', isPlaying.value)
}

const playSelectedChord = async (slotIndex) => {
  if (slotIndex === null) return
  
  const chord = props.chords[slotIndex]?.chord
  if (!chord) return
  
  // Stop any currently playing progression
  stopAllPlayback()
  
  try {
    // Start Tone.js audio context
    await Tone.start()
    
    // Get notes for the chord
    const response = await getProgressionNotes([chord])
    const notes = response.notes
    
    if (!notes || notes.length === 0) return
    
    // Stop any currently playing selection synth
    if (selectionSynth) {
      selectionSynth.releaseAll()
      selectionSynth.dispose()
    }
    
    // Create and play the synth
    selectionSynth = synths[preferences.value.instrument]()
    
    selectionSynth.triggerAttackRelease(notes[0], preferences.value.secondsPerChord)
    
    console.log('Playing selected chord:', chord)
  } catch (error) {
    console.error('Error playing chord:', error)
  }
}

// Watch for slot selection changes and play the chord
watch(() => props.selectedSlot, (newSlot, oldSlot) => {
  // Only play if a new slot is selected (not when deselecting)
  if (newSlot !== null && newSlot !== oldSlot) {
    playSelectedChord(newSlot)
  }
})

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

const playSuggestedChord = async (chord) => {
  if (!chord) return
  
  // Stop any currently playing progression
  stopAllPlayback()
  
  try {
    // Start Tone.js audio context
    await Tone.start()
    
    // Get notes for the chord
    const response = await getProgressionNotes([chord])
    const notes = response.notes
    
    if (!notes || notes.length === 0) return
    
    // Stop selection synth if playing
    if (selectionSynth) {
      selectionSynth.releaseAll()
      selectionSynth.dispose()
      selectionSynth = null
    }
    
    // Create and play the synth
    selectionSynth = synths[preferences.value.instrument]()
    
    selectionSynth.triggerAttackRelease(notes[0], preferences.value.secondsPerChord)
    
    console.log('Playing suggested chord:', chord)
  } catch (error) {
    console.error('Error playing suggested chord:', error)
  }
}

const stopAllPlayback = () => {
  // Stop main playback
  if (isPlaying.value) {
    isPlaying.value = false
  }
  
  // Clear timeout
  if (playbackTimeout) {
    clearTimeout(playbackTimeout)
    playbackTimeout = null
  }
  
  // Stop and dispose of all synths
  if (currentSynth) {
    currentSynth.releaseAll()
    currentSynth.dispose()
    currentSynth = null
  }
  
  if (selectionSynth) {
    selectionSynth.releaseAll()
    selectionSynth.dispose()
    selectionSynth = null
  }
  
  console.log('All playback stopped')
}

const stopProgressionPlayback = () => {
  stopAllPlayback()
}

const playProgressionSequence = async (chords, fromMainPlayback = false) => {
  if (!chords?.length) return
  
  // Stop any currently playing audio (but preserve isPlaying if from main playback)
  const wasPlaying = isPlaying.value
  stopAllPlayback()
  if (fromMainPlayback && wasPlaying) {
    isPlaying.value = true
  }
  
  await Tone.start()
  
  // Get all notes for the progression
  const response = await getProgressionNotes(chords)
  if (!response.notes?.length) return
  
  // Create synth and schedule all notes
  currentSynth = createSynth()
  
  for (let i = 0; i < response.notes.length; i++) {
    currentSynth.triggerAttackRelease(response.notes[i], preferences.value.secondsPerChord, `+${i * preferences.value.secondsPerChord}`)
  }
  
  // Set timeout to clean up after playback completes
  const totalDuration = response.notes.length * preferences.value.secondsPerChord * 1000
  playbackTimeout = setTimeout(() => {
    if (isLooping.value && isPlaying.value) {
      playProgression()
    } else {
      isPlaying.value = false
      if (currentSynth) {
        currentSynth.dispose()
        currentSynth = null
      }
      playbackTimeout = null
    }
  }, totalDuration)
}

// Expose functions and preferences to parent component
defineExpose({
  playSuggestedChord,
  playProgressionSequence,
  stopProgressionPlayback,
  preferences
})

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

      <div class="settings-group">
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
  </div>
</template>

<style scoped>
.playback-controls {
  max-width: 1000px;
  margin: 0 auto 2rem auto;
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
  border: 2px solid #8b5cf6;
  background: rgba(15, 21, 53, 0.6);
  color: #00d9ff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
  backdrop-filter: blur(10px);
}

.control-btn:hover {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  border-color: #00d9ff;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 0 25px rgba(0, 217, 255, 0.6);
}

.control-btn.playing,
.control-btn.active {
  background: linear-gradient(135deg, #ff006e 0%, #8b5cf6 100%);
  border-color: #ff006e;
  color: white;
  box-shadow: 0 0 25px rgba(255, 0, 110, 0.6);
}


.settings-group {
  display: flex;
  align-items: center;
  gap: 3rem;
  flex: 1;
  justify-content: space-evenly;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.control-label {
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  color: #00d9ff;
  font-size: 0.95rem;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-shadow: 0 0 10px rgba(0, 217, 255, 0.4);
}

.instrument-select {
  padding: 0.5rem 2rem 0.5rem 1rem;
  border: 2px solid #8b5cf6;
  border-radius: 6px;
  background: rgba(15, 21, 53, 0.8);
  color: #e0e7ff;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 120px;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2300d9ff' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}

.instrument-select:hover {
  border-color: #00d9ff;
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.4);
}

.instrument-select:focus {
  outline: none;
  border-color: #ff006e;
  box-shadow: 0 0 25px rgba(255, 0, 110, 0.5);
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
  border: 2px solid #8b5cf6;
  background: rgba(15, 21, 53, 0.6);
  color: #00d9ff;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
}

.seconds-btn:hover {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  border-color: #00d9ff;
  color: white;
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.5);
}

.seconds-input {
  width: 70px;
  padding: 0.5rem;
  border: 2px solid #8b5cf6;
  border-radius: 6px;
  text-align: center;
  font-family: 'Share Tech Mono', monospace;
  font-size: 1rem;
  color: #e0e7ff;
  font-weight: 600;
  background: rgba(15, 21, 53, 0.8);
  transition: all 0.3s;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
}

.seconds-input:hover {
  border-color: #00d9ff;
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.4);
}

.seconds-input:focus {
  outline: none;
  border-color: #ff006e;
  box-shadow: 0 0 25px rgba(255, 0, 110, 0.5);
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
