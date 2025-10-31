<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getProgression, addSlot, deleteSlot, reorderSlots, setChord, deleteChord, renameProgression } from '../api/progression.js'
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
const showErrorModal = ref(false)
const errorMessage = ref('')
const loading = ref(true)
const selectedSlot = ref(null)
const addButtonSelected = ref(false)

// Drag and drop state
const draggedIndex = ref(null)
const dragOverIndex = ref(null)

// Editing state
const editingSlot = ref(null)
const editingValue = ref('')
const originalValue = ref('')
const editingProgressionName = ref(false)
const progressionNameValue = ref('')
const renaming = ref(false)

// Component refs
const playbackControlsRef = ref(null)
const sidebarRef = ref(null)

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
    
    addButtonSelected.value = false
    selectedSlot.value = selectedSlot.value === index ? null : index
}

const handleAddButtonClick = async () => {
    addButtonSelected.value = false
    selectedSlot.value = null
    await handleAddSlot()
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
      showError(`"${newChord}" is not a valid chord. Please enter a valid chord name.`)
      cancelChordEdit()
      return
    }

    console.log('Saving chord edit:', { index, newChord })
    
    const response = await setChord(progression.value.id, index, newChord)
    
    if ("error" in response) {
        showError(response.error)
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

//----------- Progression Name Editing -----------
const startEditingProgressionName = async () => {
    editingProgressionName.value = true
    progressionNameValue.value = progression.value.name
    
    await nextTick()
    const input = document.querySelector('.progression-title-input')
    if (input) {
        input.focus()
        input.select()
    }
}

const cancelProgressionNameEdit = () => {
    editingProgressionName.value = false
    progressionNameValue.value = ''
}

const saveProgressionName = async () => {
    if (!progressionNameValue.value.trim()) {
        cancelProgressionNameEdit()
        return
    }
    
    renaming.value = true
    error.value = null
    
    try {
        const response = await renameProgression(progression.value.id, progressionNameValue.value.trim())
        
        if ("error" in response) {
            error.value = response.error
            return
        }
        
        progression.value.name = progressionNameValue.value.trim()
        
        // Update sidebar
        if (sidebarRef.value) {
            sidebarRef.value.updateProgressionName(progression.value.id, progressionNameValue.value.trim())
        }
    } catch (err) {
        error.value = 'Failed to rename progression'
    } finally {
        renaming.value = false
        cancelProgressionNameEdit()
    }
}

const handleProgressionNameKeyDown = async (event) => {
    if (event.key === 'Enter') {
        event.preventDefault()
        event.target.blur() // Trigger blur to save
    } else if (event.key === 'Escape') {
        event.preventDefault()
        cancelProgressionNameEdit()
    }
}

//----------- Slot Management (Add/Delete) -----------
const handleAddSlot = async () => {
    const oldLength = progression.value.chords.length
    const response = await addSlot(progression.value.id)
    console.log('Add slot response:', response)
    
    if ("error" in response) {
        error.value = response.error
        return
    }
    
    await loadProgression(currentProgressionId.value)
    
    // Select the newly added slot
    addButtonSelected.value = false
    selectedSlot.value = oldLength
}

const handleKeyDown = async (event) => {
    // Don't handle shortcuts while editing chord or progression name
    if (editingSlot.value !== null || editingProgressionName.value) {
        return
    }
    
    // Handle arrow key and tab navigation
    if (addButtonSelected.value) {
        if (event.key === 'ArrowLeft') {
            event.preventDefault()
            addButtonSelected.value = false
            selectedSlot.value = progression.value.chords.length - 1
            return
        } else if (event.key === 'Enter') {
            event.preventDefault()
            await handleAddSlot()
            return
        }
    } else if (selectedSlot.value !== null) {
        if (event.key === 'ArrowLeft') {
            event.preventDefault()
            if (selectedSlot.value > 0) {
                selectedSlot.value--
            }
            return
        } else if (event.key === 'ArrowRight' || event.key === 'Tab') {
            event.preventDefault()
            if (selectedSlot.value < progression.value.chords.length - 1) {
                selectedSlot.value++
            } else if (progression.value.chords.length < MAX_BAR_CELLS) {
                // Move to add button if at last slot and add button exists
                selectedSlot.value = null
                addButtonSelected.value = true
            }
            return
        }
    }
    
    // Handle Delete/Backspace for selected slot
    if ((event.key === 'Backspace' || event.key === 'Delete') && selectedSlot.value !== null) {
        const currentChord = progression.value.chords[selectedSlot.value]
        const deletedIndex = selectedSlot.value
        
        // If slot has a chord, delete the chord (set to empty)
        if (currentChord && currentChord.chord) {
            const response = await deleteChord(progression.value.id, selectedSlot.value)
            console.log('Delete chord response:', response)
            
            if ("error" in response) {
                error.value = response.error
                return
            }
            
            await loadProgression(currentProgressionId.value)
            // Keep the same slot selected (now empty)
            selectedSlot.value = deletedIndex
        } 
        // If slot is empty, delete the slot
        else {
            const response = await deleteSlot(progression.value.id, selectedSlot.value)
            console.log('Delete slot response:', response)
            
            if ("error" in response) {
                error.value = response.error
                return
            }
            
            await loadProgression(currentProgressionId.value)
            
            // Select the slot that moved into this position, or the add button if at the end
            if (deletedIndex < progression.value.chords.length) {
                selectedSlot.value = deletedIndex
            } else if (progression.value.chords.length < MAX_BAR_CELLS) {
                // Select add button if it exists
                selectedSlot.value = null
                addButtonSelected.value = true
            } else {
                // Select the last slot if no add button
                selectedSlot.value = progression.value.chords.length - 1
            }
        }
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

const handleProgressionRenamed = (progressionId, newName) => {
    // Update the progression name if it's the current one
    if (progression.value.id === progressionId) {
        progression.value.name = newName
    }
}

const goToHome = () => {
    router.push({ name: 'home' })
}

const handleClickOutside = (event) => {
    // Only deselect add button if it's selected
    if (!addButtonSelected.value) return
    
    // Check if click is outside the progression bar
    const progressionBar = document.querySelector('.progression-bar')
    if (progressionBar && !progressionBar.contains(event.target)) {
        addButtonSelected.value = false
    }
}

const showError = (message) => {
    errorMessage.value = message
    showErrorModal.value = true
}

const closeErrorModal = () => {
    showErrorModal.value = false
    errorMessage.value = ''
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
    window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="progression-builder" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <ProgressionSidebar 
      ref="sidebarRef"
      @progressionSelected="handleProgressionSelected"
      @collapsed="handleSidebarCollapsed"
      @progressionRenamed="handleProgressionRenamed"
    />
    
    <header class="header">
      <h1 @click="goToHome" class="clickable-title">Chordify</h1>
    </header>
    
    <main class="content">
      <div v-if="loading" class="loading"></div>
      
      <div v-else-if="error" class="error">
        {{ error }}
      </div>
      
      <div v-else class="progression-info">
        <div class="progression-title-container">
          <input
            v-if="editingProgressionName"
            v-model="progressionNameValue"
            class="progression-title-input"
            @keydown="handleProgressionNameKeyDown"
            @blur="saveProgressionName"
            :disabled="renaming"
            autofocus
          />
          <h2 
            v-else
            @dblclick="startEditingProgressionName"
            class="progression-title"
          >{{ progression.name }}</h2>
        </div>
        
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
            <div v-if="progression.chords.length < MAX_BAR_CELLS" class="bar-cell">
              <button class="add-chord-btn" :class="{ 'add-btn-selected': addButtonSelected }" @click="handleAddButtonClick">+</button>
            </div>
            <div v-for="n in (MAX_BAR_CELLS - progression.chords.length - (progression.chords.length < MAX_BAR_CELLS ? 1 : 0))" :key="`empty-${n}`" class="bar-cell"></div>
          </div>
        </div>
        
        <ChordSuggestion 
          :progressionId="progression.id" 
          :selectedSlot="selectedSlot"
          :chords="progression.chords"
          :playbackControls="playbackControlsRef"
          :onUseProgression="handleUseProgression"
          @chordUpdated="loadProgression(currentProgressionId)"
          @error="showError"
        />
      </div>
    </main>
    
    <!-- Error Modal -->
    <div v-if="showErrorModal" class="modal-overlay" @click="closeErrorModal">
      <div class="modal-content error-modal" @click.stop>
        <h3>Error</h3>
        <p>{{ errorMessage }}</p>
        <div class="modal-actions">
          <button class="confirm-btn" @click="closeErrorModal">OK</button>
        </div>
      </div>
    </div>
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
  color: white;
}

.clickable-title {
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.clickable-title:hover {
  transform: scale(1.05);
  opacity: 0.9;
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

.progression-title-container {
  margin-bottom: 2rem;
}

.progression-title {
  font-size: 2rem;
  color: #35495e;
  margin: 0;
  cursor: pointer;
  display: inline-block;
  padding: 0.25rem 0.5rem;
  font-weight: bold;
  line-height: 1.2;
}

.progression-title-input {
  font-size: 2rem;
  color: #35495e;
  font-weight: bold;
  border: none;
  padding: 0.25rem 0.5rem;
  text-align: center;
  outline: none;
  background: transparent;
  min-width: 300px;
  line-height: 1.2;
  font-family: inherit;
}

.progression-title-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.add-btn-selected {
  border: 3px solid #35495e;
  box-shadow: 0 0 0 2px rgba(53, 73, 94, 0.2);
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

/* Error Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.2s ease-out;
}

.modal-content h3 {
  margin: 0 0 1rem 0;
  color: #35495e;
  font-size: 1.5rem;
}

.modal-content p {
  margin: 0 0 1.5rem 0;
  color: #7f8c8d;
  line-height: 1.5;
}

.error-modal h3 {
  color: #e74c3c;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.confirm-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: #42b883;
  color: white;
}

.confirm-btn:hover {
  background: #35495e;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
