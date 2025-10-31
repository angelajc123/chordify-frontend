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
const startEditingProgressionName = async (event) => {
    editingProgressionName.value = true
    progressionNameValue.value = progression.value.name
    
    await nextTick()
    const titleElement = event.target
    if (titleElement) {
        // Select all text
        const range = document.createRange()
        range.selectNodeContents(titleElement)
        const selection = window.getSelection()
        selection.removeAllRanges()
        selection.addRange(range)
    }
}

const cancelProgressionNameEdit = () => {
    editingProgressionName.value = false
    progressionNameValue.value = ''
}

const handleProgressionNameInput = (event) => {
    progressionNameValue.value = event.target.textContent
}

const saveProgressionName = async (event) => {
    const newName = event.target.textContent.trim()
    
    if (!newName) {
        // Restore original name if empty
        event.target.textContent = progression.value.name
        editingProgressionName.value = false
        return
    }
    
    if (newName === progression.value.name) {
        editingProgressionName.value = false
        return
    }
    
    renaming.value = true
    error.value = null
    
    try {
        const response = await renameProgression(progression.value.id, newName)
        
        if ("error" in response) {
            error.value = response.error
            // Restore original name on error
            event.target.textContent = progression.value.name
            return
        }
        
        progression.value.name = newName
        
        // Update sidebar
        if (sidebarRef.value) {
            sidebarRef.value.updateProgressionName(progression.value.id, newName)
        }
    } catch (err) {
        error.value = 'Failed to rename progression'
        event.target.textContent = progression.value.name
    } finally {
        renaming.value = false
        editingProgressionName.value = false
    }
}

const handleProgressionNameKeyDown = async (event) => {
    if (event.key === 'Enter') {
        event.preventDefault()
        event.target.blur() // Trigger blur to save
    } else if (event.key === 'Escape') {
        event.preventDefault()
        // Restore original name
        event.target.textContent = progression.value.name
        editingProgressionName.value = false
        event.target.blur()
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
          <h2 
            @dblclick="startEditingProgressionName"
            @blur="saveProgressionName"
            @input="handleProgressionNameInput"
            @keydown="handleProgressionNameKeyDown"
            :contenteditable="editingProgressionName"
            class="progression-title"
            :class="{ 'editing': editingProgressionName }"
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
  background: linear-gradient(135deg, #050816 0%, #0a0e27 50%, #1a1f3a 100%);
  position: relative;
}

.progression-builder::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 217, 255, 0.02) 2px,
      rgba(0, 217, 255, 0.02) 4px
    );
  pointer-events: none;
  z-index: 0;
}

.progression-builder.sidebar-collapsed {
  margin-left: 0;
}

.header {
  padding: 2rem;
  text-align: center;
  background: linear-gradient(135deg, #ff006e 0%, #8b5cf6 50%, #00d9ff 100%);
  color: white;
  box-shadow: 0 4px 20px rgba(255, 0, 110, 0.5), 0 0 40px rgba(139, 92, 246, 0.3);
  border-bottom: 2px solid rgba(0, 217, 255, 0.5);
  position: relative;
  z-index: 1;
}

.header h1 {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 2.5rem;
  font-weight: 900;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.5), 0 0 40px rgba(0, 217, 255, 0.5);
}

.clickable-title {
  cursor: pointer;
  transition: transform 0.2s ease, text-shadow 0.3s ease;
}

.clickable-title:hover {
  transform: scale(1.05);
  text-shadow: 0 0 30px rgba(255, 255, 255, 0.8), 0 0 60px rgba(0, 217, 255, 0.8);
}

.content {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  position: relative;
  z-index: 1;
}

.loading,
.error {
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  letter-spacing: 0.1em;
}

.loading {
  color: #00d9ff;
  text-shadow: 0 0 10px rgba(0, 217, 255, 0.5);
}

.error {
  color: #ff006e;
  text-shadow: 0 0 10px rgba(255, 0, 110, 0.5);
}

.progression-info {
  text-align: center;
  padding: 2rem;
}

.progression-title-container {
  margin-bottom: 2rem;
}

.progression-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 2rem;
  color: #00d9ff;
  margin: 0;
  cursor: pointer;
  display: inline-block;
  padding: 0.25rem 0.5rem;
  font-weight: 700;
  line-height: 1.2;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-shadow: 0 0 15px rgba(0, 217, 255, 0.6);
  transition: all 0.3s ease;
}

.progression-title:hover:not(.editing) {
  color: #ff006e;
  text-shadow: 0 0 20px rgba(255, 0, 110, 0.8);
}

.progression-title.editing {
  outline: none;
  color: #00d9ff;
  text-shadow: 0 0 15px rgba(0, 217, 255, 0.6);
  border: 2px solid #ff006e;
  border-radius: 6px;
  box-shadow: 0 0 20px rgba(255, 0, 110, 0.5);
}

.progression-title.editing:focus {
  outline: none;
  border-color: #ff006e;
  box-shadow: 0 0 25px rgba(255, 0, 110, 0.6);
}

.progression-title-input {
  font-family: 'Orbitron', sans-serif;
  font-size: 2rem;
  color: #00d9ff;
  font-weight: 700;
  border: 2px solid #8b5cf6;
  padding: 0.25rem 0.5rem;
  text-align: center;
  outline: none;
  background: rgba(15, 21, 53, 0.8);
  min-width: 300px;
  line-height: 1.2;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
}

.progression-title-input:focus {
  border-color: #ff006e;
  box-shadow: 0 0 30px rgba(255, 0, 110, 0.6);
}

.progression-title-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.progression-bar {
  max-width: 1000px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 0 30px rgba(139, 92, 246, 0.5), 0 0 60px rgba(255, 0, 110, 0.3);
  border: 2px solid rgba(139, 92, 246, 0.5);
}

.bar-numbers {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  background: linear-gradient(135deg, #ff006e 0%, #8b5cf6 50%, #00d9ff 100%);
}

.bar-number {
  padding: 0.75rem;
  text-align: center;
  color: white;
  font-family: 'Share Tech Mono', monospace;
  font-weight: bold;
  font-size: 1rem;
  border-right: 2px solid rgba(255, 255, 255, 0.3);
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.bar-number:last-child {
  border-right: none;
}

.bar-cells {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  background: rgba(15, 21, 53, 0.6);
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-top: none;
  backdrop-filter: blur(10px);
}

.bar-cell {
  min-height: 100px;
  border-right: 2px solid rgba(139, 92, 246, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(10, 14, 39, 0.4);
  transition: all 0.3s;
}

.bar-cell:hover {
  background: rgba(139, 92, 246, 0.1);
  box-shadow: inset 0 0 20px rgba(139, 92, 246, 0.2);
}

.bar-cell:last-child {
  border-right: none;
}

.add-chord-btn {
  width: 50px;
  height: 80px;
  background: rgba(15, 21, 53, 0.6);
  border: 2px solid #00d9ff;
  color: #00d9ff;
  font-size: 2rem;
  font-weight: bold;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s;
  box-shadow: 0 0 15px rgba(0, 217, 255, 0.4);
  backdrop-filter: blur(10px);
}

.add-chord-btn:hover {
  background: linear-gradient(135deg, #ff006e 0%, #8b5cf6 100%);
  color: white;
  border-color: #ff006e;
  transform: translateY(-2px);
  box-shadow: 0 0 25px rgba(255, 0, 110, 0.6), 0 0 40px rgba(139, 92, 246, 0.4);
}

.add-btn-selected {
  border: 3px solid #ff006e;
  box-shadow: 0 0 20px rgba(255, 0, 110, 0.6);
  background: rgba(255, 0, 110, 0.2);
}

.slot {
  width: calc(100%);
  height: 80px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  border-radius: 8px;
  border: 2px solid rgba(139, 92, 246, 0.5);
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.5), inset 0 0 10px rgba(139, 92, 246, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Share Tech Mono', monospace;
  font-weight: bold;
  color: white;
  font-size: 1.2rem;
  cursor: move;
  transition: all 0.3s;
  user-select: none;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.slot:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 25px rgba(139, 92, 246, 0.8), 0 0 40px rgba(255, 0, 110, 0.4);
  border-color: #ff006e;
}

.slot-empty {
  background: rgba(15, 21, 53, 0.6);
  border: 2px dashed rgba(139, 92, 246, 0.5);
  color: #94a3b8;
  font-weight: 400;
  font-style: italic;
  box-shadow: 0 0 10px rgba(139, 92, 246, 0.2);
}


.slot-selected {
  background: linear-gradient(135deg, #ff006e 0%, #8b5cf6 100%);
  border-color: #00d9ff;
  box-shadow: 0 0 30px rgba(255, 0, 110, 0.8), 0 0 50px rgba(0, 217, 255, 0.5);
}

.slot-dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.slot-drag-over {
  border: 3px dashed #00d9ff;
  background: linear-gradient(135deg, rgba(0, 217, 255, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%);
  box-shadow: 0 0 30px rgba(0, 217, 255, 0.6);
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
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.2rem;
  font-weight: bold;
  text-align: center;
  padding: 0 0.5rem;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

/* Error Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(5, 8, 22, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  background: linear-gradient(135deg, rgba(15, 21, 53, 0.95) 0%, rgba(10, 14, 39, 0.95) 100%);
  padding: 2rem;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  border: 2px solid rgba(139, 92, 246, 0.5);
  box-shadow: 0 0 40px rgba(139, 92, 246, 0.5), 0 0 80px rgba(255, 0, 110, 0.3);
  animation: slideUp 0.2s ease-out;
  backdrop-filter: blur(20px);
}

.modal-content h3 {
  margin: 0 0 1rem 0;
  font-family: 'Orbitron', sans-serif;
  color: #00d9ff;
  font-size: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-shadow: 0 0 15px rgba(0, 217, 255, 0.6);
}

.modal-content p {
  margin: 0 0 1.5rem 0;
  color: #94a3b8;
  line-height: 1.5;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 500;
}

.error-modal h3 {
  color: #ff006e;
  text-shadow: 0 0 15px rgba(255, 0, 110, 0.6);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.confirm-btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid #00d9ff;
  border-radius: 8px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  color: white;
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.confirm-btn:hover {
  background: linear-gradient(135deg, #ff006e 0%, #8b5cf6 100%);
  border-color: #ff006e;
  box-shadow: 0 0 30px rgba(255, 0, 110, 0.7);
  transform: translateY(-2px);
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
