<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getProgression, addSlot, deleteSlot, reorderSlots, setChord } from '../api/progression.js'
import ChordSuggestion from './ChordSuggestion.vue'
import PlaybackControls from './PlaybackControls.vue'
import ProgressionSidebar from './ProgressionSidebar.vue'
import { isValidChord } from '../shared/constants.js'

const router = useRouter()

const MAX_BAR_CELLS = 8

const props = defineProps({
  initialProgressionId: {
    type: String,
    default: '019a08bc-6d5f-702e-bd63-ff7fb3bb0d21'
  }
})

const currentProgressionId = ref(props.initialProgressionId)
const isSidebarCollapsed = ref(false)

const progression = ref({
    id: '',
    name: '',
    chords: []
})

// UI state
const error = ref(null)
const loading = ref(true)
const selectedSlot = ref(null)

// Drag and drop state
const draggedIndex = ref(null)
const dragOverIndex = ref(null)

// Editing state
const editingSlot = ref(null)
const editingValue = ref('')
const originalValue = ref('')

// Component refs
const playbackControlsRef = ref(null)

//----------- Data Loading -----------
const loadProgression = async (progressionId) => {
    const response = await getProgression(progressionId)
    console.log('Loaded progression:', response)

    if ("error" in response) {
        error.value = response.error
        return
    }

    progression.value.id = response.progression._id || ''
    progression.value.name = response.progression.name || ''
    progression.value.chords = response.progression.chords || []
    loading.value = false
}

//----------- Slot Selection & Interaction -----------
const handleSlotClick = async (index) => {
    if (editingSlot.value !== null && editingSlot.value !== index) {
        await saveChordEdit(editingSlot.value)
    }
    
    if (editingSlot.value === index) {
        return
    }
    
    selectedSlot.value = selectedSlot.value === index ? null : index
}

const handleSlotDoubleClick = async (index) => {
    selectedSlot.value = index
    editingSlot.value = index
    
    // Store original value for potential cancellation
    originalValue.value = progression.value.chords[index].chord || ''
    editingValue.value = originalValue.value
    
    // Focus and select the input field
    await nextTick()
    const input = document.querySelector('.chord-input')
    if (input) {
        input.focus()
        input.select()
    }
}

//----------- Chord Editing -----------
const handleInputKeyDown = async (event, index) => {
    if (event.key === 'Enter') {
        event.preventDefault()
        await saveChordEdit(index)
    } else if (event.key === 'Escape') {
        event.preventDefault()
        cancelChordEdit()
    }
}

const saveChordEdit = async (index) => {
    const newChord = editingValue.value.trim()
    if (!isValidChord(newChord)) {
      console.log('Invalid chord:', newChord)
      cancelChordEdit()
      return
    }

    console.log('Saving chord edit:', { index, newChord })
    
    const response = await setChord(progression.value.id, index, newChord)
    
    if ("error" in response) {
        error.value = response.error
        clearEditingState()
        return
    }
    
    clearEditingState()
    await loadProgression(currentProgressionId.value)
}

const cancelChordEdit = () => {
    clearEditingState()
}

const clearEditingState = () => {
    editingSlot.value = null
    editingValue.value = ''
    originalValue.value = ''
}

//----------- Slot Management (Add/Delete) -----------
const handleAddSlot = async () => {
    const response = await addSlot(progression.value.id)
    console.log('Add slot response:', response)
    
    if ("error" in response) {
        error.value = response.error
        return
    }
    
    await loadProgression(currentProgressionId.value)
}

const handleKeyDown = async (event) => {
    // Don't handle shortcuts while editing
    if (editingSlot.value !== null) {
        return
    }
    
    // Delete selected slot with Backspace
    if (event.key === 'Backspace' && selectedSlot.value !== null) {
        const response = await deleteSlot(progression.value.id, selectedSlot.value)
        console.log('Delete slot response:', response)
        
        if ("error" in response) {
            error.value = response.error
            return
        }
        
        selectedSlot.value = null
        await loadProgression(currentProgressionId.value)
    }
}

//----------- Drag and Drop -----------
const handleDragStart = (event, index) => {
    // Prevent dragging while editing
    if (editingSlot.value !== null) {
        event.preventDefault()
        return
    }
    
    draggedIndex.value = index
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', index)
    event.target.style.opacity = '0.5'
}

const handleDragEnd = (event) => {
    event.target.style.opacity = '1'
    clearDragState()
}

const handleDragOver = (event, index) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    dragOverIndex.value = index
}

const handleDragLeave = () => {
    dragOverIndex.value = null
}

const handleDrop = async (event, newIndex) => {
    event.preventDefault()
    
    const oldIndex = draggedIndex.value
    
    // Ignore invalid drops
    if (oldIndex === null || oldIndex === newIndex) {
        clearDragState()
        return
    }
    
    const wasSelected = selectedSlot.value === oldIndex
    
    const response = await reorderSlots(progression.value.id, oldIndex, newIndex)
    console.log('Reorder slots response:', response)
    
    if ("error" in response) {
        error.value = response.error
        clearDragState()
        return
    }
    
    await loadProgression(currentProgressionId.value)
    
    // Update selection to follow the moved slot
    updateSelectionAfterReorder(oldIndex, newIndex, wasSelected)
    clearDragState()
}

const updateSelectionAfterReorder = (oldIndex, newIndex, wasSelected) => {
    if (wasSelected) {
        selectedSlot.value = newIndex
    } else if (selectedSlot.value !== null) {
        // Adjust selection if it was affected by the reorder
        if (oldIndex < newIndex) {
            // Moving right: decrement selection if it's in the affected range
            if (selectedSlot.value > oldIndex && selectedSlot.value <= newIndex) {
                selectedSlot.value--
            }
        } else {
            // Moving left: increment selection if it's in the affected range
            if (selectedSlot.value >= newIndex && selectedSlot.value < oldIndex) {
                selectedSlot.value++
            }
        }
    }
}

const clearDragState = () => {
    draggedIndex.value = null
    dragOverIndex.value = null
}

//----------- Progression Management -----------
const handleUseProgression = async (progressionChords) => {
    if (!progressionChords) return
    
    // Set each chord in the progression to the corresponding slot
    for (let i = 0; i < progressionChords.length && i < progression.value.chords.length; i++) {
        const response = await setChord(progression.value.id, i, progressionChords[i])
        if ("error" in response) {
            error.value = response.error
            return
        }
    }
    
    // Clear remaining slots if progression is shorter than slot count
    for (let i = progressionChords.length; i < progression.value.chords.length; i++) {
        const response = await setChord(progression.value.id, i, '')
        if ("error" in response) {
            error.value = response.error
            return
        }
    }
    
    // Reload the progression
    await loadProgression(currentProgressionId.value)
}

//----------- Progression Switching -----------
const handleProgressionSelected = (progressionId) => {
    router.push({ name: 'progression', params: { id: progressionId } })
}

const handleSidebarCollapsed = (collapsed) => {
    isSidebarCollapsed.value = collapsed
}

// Watch for changes to the route params
watch(() => props.initialProgressionId, async (newId) => {
    if (newId && newId !== currentProgressionId.value) {
        currentProgressionId.value = newId
        loading.value = true
        selectedSlot.value = null
        clearEditingState()
        await loadProgression(newId)
    }
})

// --------- Lifecycle Hooks ---------
onMounted(async () => {
    await loadProgression(currentProgressionId.value)
    window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="progression-builder" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <ProgressionSidebar 
      @progressionSelected="handleProgressionSelected"
      @collapsed="handleSidebarCollapsed"
    />
    
    <header class="header">
      <h1>Chordify</h1>
    </header>
    
    <main class="content">
      <div v-if="loading" class="loading"></div>
      
      <div v-else-if="error" class="error">
        {{ error }}
      </div>
      
      <div v-else class="progression-info">
        <h2>{{ progression.name }}</h2>
        
        <PlaybackControls ref="playbackControlsRef" :progressionId="progression.id" :chords="progression.chords" :selectedSlot="selectedSlot"/>
        
        <div class="progression-bar">
          <div class="bar-numbers">
            <div class="bar-number">1</div>
            <div class="bar-number">2</div>
            <div class="bar-number">3</div>
            <div class="bar-number">4</div>
            <div class="bar-number">5</div>
            <div class="bar-number">6</div>
            <div class="bar-number">7</div>
            <div class="bar-number">8</div>
          </div>
          <div class="bar-cells">
            <div 
              v-for="(chord, index) in progression.chords" 
              :key="index" 
              class="bar-cell"
              @dragover="handleDragOver($event, index)"
              @dragleave="handleDragLeave"
              @drop="handleDrop($event, index)"
            >
              <div 
                class="slot" 
                :class="{ 
                  'slot-empty': !chord.chord,
                  'slot-selected': selectedSlot === index,
                  'slot-dragging': draggedIndex === index,
                  'slot-drag-over': dragOverIndex === index,
                  'slot-editing': editingSlot === index
                }"
                :draggable="editingSlot === null"
                @dragstart="handleDragStart($event, index)"
                @dragend="handleDragEnd"
                @click="handleSlotClick(index)"
                @dblclick="handleSlotDoubleClick(index)"
              >
                <input
                  v-if="editingSlot === index"
                  v-model="editingValue"
                  class="chord-input"
                  @keydown="handleInputKeyDown($event, index)"
                  @click.stop
                />
                <span v-else>{{ chord.chord || 'Empty' }}</span>
              </div>
            </div>
            <div class="bar-cell">
              <button class="add-chord-btn" @click="handleAddSlot">+</button>
            </div>
            <div v-for="n in (MAX_BAR_CELLS - 1 - progression.chords.length)" :key="`empty-${n}`" class="bar-cell"></div>
          </div>
        </div>
        
        <ChordSuggestion 
          :progressionId="progression.id" 
          :selectedSlot="selectedSlot"
          :chords="progression.chords"
          :playbackControls="playbackControlsRef"
          :onUseProgression="handleUseProgression"
          @chordUpdated="loadProgression(currentProgressionId)"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
.progression-builder {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  margin-left: 280px;
  transition: margin-left 0.3s ease;
}

.progression-builder.sidebar-collapsed {
  margin-left: 0;
}

.header {
  padding: 2rem;
  text-align: center;
  background: linear-gradient(135deg, #42b883 0%, #35495e 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header h1 {
  margin: 0;
  font-size: 2.5rem;
  font-weight: bold;
}

.content {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.loading,
.error {
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
}

.loading {
  color: #42b883;
}

.error {
  color: #e74c3c;
}

.progression-info {
  text-align: center;
  padding: 2rem;
}

.progression-info h2 {
  font-size: 2rem;
  color: #35495e;
  margin: 0 0 2rem 0;
}

.progression-bar {
  max-width: 1000px;
  margin: 0 auto;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.bar-numbers {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  background: linear-gradient(135deg, #42b883 0%, #35495e 100%);
}

.bar-number {
  padding: 0.75rem;
  text-align: center;
  color: white;
  font-weight: bold;
  font-size: 1rem;
  border-right: 2px solid rgba(255, 255, 255, 0.3);
}

.bar-number:last-child {
  border-right: none;
}

.bar-cells {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  background: white;
  border: 2px solid #e0e0e0;
  border-top: none;
}

.bar-cell {
  min-height: 100px;
  border-right: 2px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: #fafafa;
  transition: background 0.2s;
}

.bar-cell:hover {
  background: #f5f5f5;
}

.bar-cell:last-child {
  border-right: none;
}

.add-chord-btn {
  width: 50px;
  height: 80px;
  background: white;
  border: 2px solid #42b883;
  color: #42b883;
  font-size: 2rem;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.add-chord-btn:hover {
  background: #42b883;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(66, 184, 131, 0.3);
}

.slot {
  width: calc(100%);
  height: 80px;
  background: #42b883;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  font-size: 1.2rem;
  cursor: move;
  transition: all 0.2s;
  user-select: none;
}

.slot:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(66, 184, 131, 0.4);
}

.slot-empty {
  font-weight: 300;
  font-style: italic;
}

.slot-selected {
  background: #35495e;
}

.slot-dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.slot-drag-over {
  border: 3px dashed #9e9e9e;
  background: #7dd4b4;
}

.slot-editing {
  cursor: text;
  padding: 0;
}

.chord-input {
  width: 100%;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: white;
  font-size: 1.2rem;
  font-weight: bold;
  text-align: center;
  padding: 0 0.5rem;
}

@media (max-width: 768px) {
  .progression-builder {
    margin-left: 240px;
  }
}

@media (max-width: 480px) {
  .progression-builder {
    margin-left: 0;
  }
}
</style>
