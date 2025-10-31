<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { listProgressions, deleteProgression, createProgression, renameProgression } from '../api/progression.js'
import { deleteSettings, initializeSettings } from '../api/playback.js'
import { deletePreferences, initializePreferences } from '../api/suggest.js'

const router = useRouter()
const route = useRoute()
const emit = defineEmits(['progressionSelected', 'collapsed', 'progressionRenamed'])

const isCollapsed = ref(false)
const progressions = ref([])
const loading = ref(true)
const error = ref(null)
const selectedProgressionId = ref(null)
const showDeleteConfirm = ref(false)
const progressionToDelete = ref(null)
const deleting = ref(false)
const showCreateModal = ref(false)
const newProgressionName = ref('')
const creating = ref(false)
const editingProgressionId = ref(null)
const editingProgressionName = ref('')
const renaming = ref(false)

const loadProgressions = async () => {
  loading.value = true
  error.value = null
  
  const response = await listProgressions()
  console.log('listProgressions response:', response)
  
  if ("error" in response) {
    error.value = response.error
    loading.value = false
    return
  }
  
  if (response.progressionIdentifiers) {
    progressions.value = response.progressionIdentifiers
  }
  
  loading.value = false
}

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
  emit('collapsed', isCollapsed.value)
}

const selectProgression = (progressionId) => {
  selectedProgressionId.value = progressionId
  emit('progressionSelected', progressionId)
}

const goToHome = () => {
  selectedProgressionId.value = null
  router.push({ name: 'home' })
}

const confirmDelete = (progression, event) => {
  event.stopPropagation()
  progressionToDelete.value = progression
  showDeleteConfirm.value = true
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  progressionToDelete.value = null
}

const handleDelete = async () => {
  if (!progressionToDelete.value) return
  
  deleting.value = true
  const progressionId = progressionToDelete.value.id
  const wasOnDeletedPage = route.params.id === progressionId
  
  try {
    // Delete progression data
    let res = await deleteProgression(progressionId)
    console.log('deleteProgression response:', res)
    
    // Delete associated settings and preferences
    res = await deleteSettings(progressionId)
    console.log('deleteSettings response:', res)
    
    res = await deletePreferences(progressionId)
    console.log('deletePreferences response:', res)
    
    // Remove from local list
    progressions.value = progressions.value.filter(p => p.id !== progressionId)
    
    // If user was on the deleted progression page, redirect to home
    if (wasOnDeletedPage) {
      router.push({ name: 'home' })
    }
    
    // Close confirmation dialog
    showDeleteConfirm.value = false
    progressionToDelete.value = null
  } catch (err) {
    error.value = 'Failed to delete progression'
  } finally {
    deleting.value = false
  }
}

const openCreateModal = () => {
  showCreateModal.value = true
  newProgressionName.value = ''
}

const cancelCreate = () => {
  showCreateModal.value = false
  newProgressionName.value = ''
}

const handleCreateProgression = async () => {
  if (!newProgressionName.value.trim()) {
    return
  }
  
  creating.value = true
  error.value = null
  
  try {
    // Create the progression
    const createResponse = await createProgression(newProgressionName.value.trim())
    
    if ("error" in createResponse) {
      error.value = createResponse.error
      creating.value = false
      return
    }
    
    const progressionId = createResponse.progression._id
    
    // Initialize playback settings
    await initializeSettings(progressionId)
    
    // Initialize suggestion preferences
    await initializePreferences(progressionId)
    
    // Reload progressions list
    await loadProgressions()
    
    // Close modal
    showCreateModal.value = false
    newProgressionName.value = ''
    
    // Navigate to the new progression
    router.push({ name: 'progression', params: { id: progressionId } })
  } catch (err) {
    error.value = 'Failed to create progression'
  } finally {
    creating.value = false
  }
}

const handleCreateKeyPress = (event) => {
  if (event.key === 'Enter') {
    handleCreateProgression()
  }
}

const startRenaming = async (progression, event) => {
  event.stopPropagation()
  editingProgressionId.value = progression.id
  editingProgressionName.value = progression.name
  
  await nextTick()
  const input = document.querySelector('.progression-name-input')
  if (input) {
    input.focus()
    input.select()
  }
}

const cancelRenaming = () => {
  editingProgressionId.value = null
  editingProgressionName.value = ''
}

const handleRename = async (progressionId) => {
  if (!editingProgressionName.value.trim()) {
    cancelRenaming()
    return
  }
  
  renaming.value = true
  error.value = null
  
  try {
    const response = await renameProgression(progressionId, editingProgressionName.value.trim())
    
    if ("error" in response) {
      error.value = response.error
      return
    }
    
    // Update local list
    const progression = progressions.value.find(p => p.id === progressionId)
    if (progression) {
      progression.name = editingProgressionName.value.trim()
      // Emit event to notify other components
      emit('progressionRenamed', progressionId, editingProgressionName.value.trim())
    }
  } catch (err) {
    error.value = 'Failed to rename progression'
  } finally {
    renaming.value = false
    cancelRenaming()
  }
}

const handleRenameKeyPress = (event, progressionId) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    event.target.blur() // Trigger blur to save
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancelRenaming()
  }
}

const isOnHomePage = computed(() => {
  return route.name === 'home'
})

const currentProgressionId = computed(() => {
  return route.params.id || null
})

// Watch for route changes to update selected progression
watch(() => route.params.id, (newId) => {
  if (newId) {
    selectedProgressionId.value = newId
  } else if (route.name === 'home') {
    selectedProgressionId.value = null
  }
})

// Method to update progression name from external source
const updateProgressionName = (progressionId, newName) => {
  const progression = progressions.value.find(p => p.id === progressionId)
  if (progression) {
    progression.name = newName
  }
}

// Expose method for parent components
defineExpose({
  updateProgressionName
})

onMounted(async () => {
  await loadProgressions()
  // Set initial selected progression from route
  if (route.params.id) {
    selectedProgressionId.value = route.params.id
  }
})
</script>

<template>
  <div class="sidebar-container" :class="{ 'sidebar-open': !isCollapsed }">
    <button class="toggle-btn" @click="toggleSidebar" :title="isCollapsed ? 'Open Menu' : 'Close Menu'">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>
    
    <div class="sidebar" :class="{ 'collapsed': isCollapsed }">
      <div class="sidebar-header" v-if="!isCollapsed">
        <button class="home-icon-btn" :class="{ 'selected': isOnHomePage }" @click="goToHome" title="Home">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </button>
      </div>
      <div class="sidebar-content" v-if="!isCollapsed">
      <button class="new-progression-btn" @click="openCreateModal">
        <span>New Progression</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      
      <h2 class="sidebar-title">Progressions</h2>
      
      <div v-if="loading" class="loading">
        Loading...
      </div>
      
      <div v-else-if="error" class="error">
        {{ error }}
      </div>
      
      <div v-else class="progression-list">
        <div
          v-for="progression in progressions"
          :key="progression.id"
          class="progression-item"
          :class="{ 'selected': selectedProgressionId === progression.id, 'editing': editingProgressionId === progression.id }"
          @click="selectProgression(progression.id)"
        >
          <input
            v-if="editingProgressionId === progression.id"
            v-model="editingProgressionName"
            class="progression-name-input"
            @click.stop
            @dblclick.stop
            @keydown="handleRenameKeyPress($event, progression.id)"
            @blur="handleRename(progression.id)"
            :disabled="renaming"
            autofocus
          />
          <span 
            v-else
            class="progression-name"
            @dblclick="startRenaming(progression, $event)"
          >{{ progression.name }}</span>
          <button 
            class="delete-btn"
            @click="confirmDelete(progression, $event)"
            title="Delete progression"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>
        
        <div v-if="progressions.length === 0" class="empty-state">
          No progressions found
        </div>
      </div>
      </div>
    </div>
    
    <!-- Create Progression Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="cancelCreate">
      <div class="modal-content" @click.stop>
        <h3>Create New Progression</h3>
        <input 
          v-model="newProgressionName"
          @keypress="handleCreateKeyPress"
          type="text" 
          placeholder="Enter progression name..."
          class="modal-input"
          :disabled="creating"
          autofocus
        />
        <p v-if="error" class="error-message">{{ error }}</p>
        <div class="modal-actions">
          <button class="cancel-btn" @click="cancelCreate" :disabled="creating">Cancel</button>
          <button class="confirm-btn" @click="handleCreateProgression" :disabled="creating || !newProgressionName.trim()">
            {{ creating ? 'Creating...' : 'Create' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="cancelDelete">
      <div class="modal-content delete-modal" @click.stop>
        <h3>Delete Progression?</h3>
        <p>Are you sure you want to delete "{{ progressionToDelete?.name }}"? This action cannot be undone.</p>
        <div class="modal-actions">
          <button class="cancel-btn" @click="cancelDelete" :disabled="deleting">Cancel</button>
          <button class="confirm-btn delete-confirm-btn" @click="handleDelete" :disabled="deleting">
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 280px;
  background: linear-gradient(180deg, rgba(15, 21, 53, 0.98) 0%, rgba(10, 14, 39, 0.98) 100%);
  box-shadow: 4px 0 30px rgba(139, 92, 246, 0.3), 0 0 60px rgba(255, 0, 110, 0.2);
  border-right: 2px solid rgba(139, 92, 246, 0.5);
  transition: transform 0.3s ease;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(20px);
}

.sidebar.collapsed {
  transform: translateX(-280px);
}

.toggle-btn {
  position: fixed;
  left: 20px;
  top: 20px;
  width: 45px;
  height: 45px;
  background: rgba(15, 21, 53, 0.9);
  border: 2px solid #8b5cf6;
  border-radius: 8px;
  color: #00d9ff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
  z-index: 1001;
  backdrop-filter: blur(10px);
}

.sidebar-container.sidebar-open .toggle-btn {
  left: 210px;
}

.toggle-btn:hover {
  background: linear-gradient(135deg, #ff006e 0%, #8b5cf6 100%);
  border-color: #ff006e;
  color: white;
  transform: scale(1.05);
  box-shadow: 0 0 30px rgba(255, 0, 110, 0.7);
}

.sidebar-header {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1002;
}

.home-icon-btn {
  width: 45px;
  height: 45px;
  padding: 0.5rem;
  background: rgba(15, 21, 53, 0.8);
  border: 2px solid #8b5cf6;
  border-radius: 8px;
  color: #00d9ff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
  backdrop-filter: blur(10px);
}

.home-icon-btn:hover {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  border-color: #00d9ff;
  color: white;
  transform: scale(1.05);
  box-shadow: 0 0 25px rgba(0, 217, 255, 0.6);
}

.home-icon-btn.selected {
  background: linear-gradient(135deg, #ff006e 0%, #8b5cf6 100%);
  border-color: #ff006e;
  color: white;
  box-shadow: 0 0 25px rgba(255, 0, 110, 0.6);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  padding-top: 90px;
}

.new-progression-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.25rem;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #ff006e 0%, #8b5cf6 100%);
  border: 2px solid rgba(255, 0, 110, 0.5);
  border-radius: 8px;
  color: white;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 0 20px rgba(255, 0, 110, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.new-progression-btn:hover {
  background: linear-gradient(135deg, #8b5cf6 0%, #00d9ff 100%);
  border-color: #00d9ff;
  transform: translateY(-2px);
  box-shadow: 0 0 30px rgba(0, 217, 255, 0.7);
}

.new-progression-btn svg {
  flex-shrink: 0;
}

.sidebar-title {
  margin: 0 0 1.5rem 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  color: #00d9ff;
  font-weight: 700;
  border-bottom: 2px solid #8b5cf6;
  padding-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-shadow: 0 0 15px rgba(0, 217, 255, 0.6);
}

.loading,
.error,
.empty-state {
  text-align: center;
  padding: 1rem;
  font-size: 0.95rem;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 500;
}

.loading {
  color: #00d9ff;
  text-shadow: 0 0 10px rgba(0, 217, 255, 0.5);
}

.error {
  color: #ff006e;
  text-shadow: 0 0 10px rgba(255, 0, 110, 0.5);
}

.empty-state {
  color: #94a3b8;
  font-style: italic;
}

.progression-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progression-item {
  padding: 0.75rem 1.25rem;
  background: rgba(15, 21, 53, 0.6);
  border: 2px solid rgba(139, 92, 246, 0.4);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: #e0e7ff;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 500;
  backdrop-filter: blur(10px);
}

.progression-item:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: #00d9ff;
  transform: translateX(4px);
  box-shadow: 0 0 15px rgba(0, 217, 255, 0.4);
}

.progression-item.selected {
  background: linear-gradient(135deg, rgba(255, 0, 110, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%);
  border-color: #ff006e;
  color: white;
  box-shadow: 0 0 20px rgba(255, 0, 110, 0.5);
}

.progression-name {
  flex: 1;
  font-weight: 500;
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  cursor: text;
}

.progression-name-input {
  flex: 1;
  font-weight: 500;
  font-size: 0.95rem;
  background: transparent;
  border: none;
  outline: none;
  color: inherit;
  padding: 0;
  text-align: left;
}

.progression-item.editing {
  cursor: text;
}

.progression-item.selected .progression-name-input {
  color: white;
}

.delete-btn {
  padding: 0.25rem;
  background: transparent;
  border: none;
  color: #ff006e;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.3s;
  opacity: 0;
}

.progression-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(255, 0, 110, 0.3);
  color: white;
  box-shadow: 0 0 15px rgba(255, 0, 110, 0.5);
}

.progression-item.selected .delete-btn {
  color: white;
  opacity: 0.7;
}

.progression-item.selected .delete-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
}

/* Scrollbar styling */
.sidebar-content::-webkit-scrollbar {
  width: 8px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: rgba(10, 14, 39, 0.5);
  border-radius: 4px;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%);
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #ff006e 0%, #8b5cf6 100%);
  box-shadow: 0 0 15px rgba(255, 0, 110, 0.7);
}

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
  z-index: 2000;
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

.modal-input {
  width: 100%;
  padding: 0.875rem 1rem;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  font-weight: 500;
  border: 2px solid #8b5cf6;
  border-radius: 8px;
  background: rgba(15, 21, 53, 0.8);
  color: #e0e7ff;
  margin-bottom: 1rem;
  transition: all 0.3s;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
}

.modal-input::placeholder {
  color: #94a3b8;
}

.modal-input:focus {
  outline: none;
  border-color: #ff006e;
  box-shadow: 0 0 25px rgba(255, 0, 110, 0.5);
  background: rgba(15, 21, 53, 0.95);
}

.modal-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  color: #ff006e;
  font-size: 0.9rem;
  margin: -0.5rem 0 1rem 0;
  text-shadow: 0 0 10px rgba(255, 0, 110, 0.5);
  font-weight: 600;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.cancel-btn,
.confirm-btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid;
  border-radius: 8px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cancel-btn {
  background: rgba(15, 21, 53, 0.6);
  border-color: #94a3b8;
  color: #e0e7ff;
}

.cancel-btn:hover:not(:disabled) {
  background: rgba(139, 92, 246, 0.2);
  border-color: #8b5cf6;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
}

.confirm-btn {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  border-color: #00d9ff;
  color: white;
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
}

.confirm-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #ff006e 0%, #8b5cf6 100%);
  border-color: #ff006e;
  box-shadow: 0 0 30px rgba(255, 0, 110, 0.7);
  transform: translateY(-2px);
}

.delete-confirm-btn {
  background: linear-gradient(135deg, #ff006e 0%, #8b5cf6 100%);
  border-color: #ff006e;
}

.delete-confirm-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #ff006e 0%, #6d28d9 100%);
  box-shadow: 0 0 35px rgba(255, 0, 110, 0.8);
}

.cancel-btn:disabled,
.confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  .sidebar {
    width: 240px;
  }
  
  .sidebar.collapsed {
    transform: translateX(-240px);
  }
  
  .sidebar-container.sidebar-open .toggle-btn {
    left: 170px;
  }
}
</style>
