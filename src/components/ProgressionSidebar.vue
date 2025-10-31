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
  background: white;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  z-index: 1000;
  display: flex;
  flex-direction: column;
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
  background: white;
  border: 2px solid #42b883;
  border-radius: 8px;
  color: #42b883;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1001;
}

.sidebar-container.sidebar-open .toggle-btn {
  left: 210px;
}

.toggle-btn:hover {
  background: #42b883;
  color: white;
  transform: scale(1.05);
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
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  color: #42b883;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.home-icon-btn:hover {
  background: #42b883;
  border-color: #42b883;
  color: white;
  transform: scale(1.05);
}

.home-icon-btn.selected {
  background: #42b883;
  border-color: #42b883;
  color: white;
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
  background: linear-gradient(135deg, #42b883 0%, #35495e 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(66, 184, 131, 0.2);
}

.new-progression-btn:hover {
  background: #35495e;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.3);
}

.new-progression-btn svg {
  flex-shrink: 0;
}

.sidebar-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  color: #35495e;
  font-weight: 600;
  border-bottom: 2px solid #42b883;
  padding-bottom: 0.75rem;
}

.loading,
.error,
.empty-state {
  text-align: center;
  padding: 1rem;
  font-size: 0.95rem;
}

.loading {
  color: #42b883;
}

.error {
  color: #e74c3c;
}

.empty-state {
  color: #95a5a6;
  font-style: italic;
}

.progression-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progression-item {
  padding: 0.75rem 1.25rem;
  background: #fafafa;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: #35495e;
}

.progression-item:hover {
  background: #f0f0f0;
  border-color: #42b883;
  transform: translateX(4px);
}

.progression-item.selected {
  background: #42b883;
  border-color: #42b883;
  color: white;
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
  color: #e74c3c;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  opacity: 0;
}

.progression-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #e74c3c;
  color: white;
}

.progression-item.selected .delete-btn {
  color: white;
  opacity: 0.7;
}

.progression-item.selected .delete-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
}

/* Scrollbar styling */
.sidebar-content::-webkit-scrollbar {
  width: 8px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: #42b883;
  border-radius: 4px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: #35495e;
}

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
  z-index: 2000;
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

.modal-input {
  width: 100%;
  padding: 0.875rem 1rem;
  font-size: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 1rem;
  transition: all 0.2s;
}

.modal-input:focus {
  outline: none;
  border-color: #42b883;
}

.modal-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  color: #e74c3c;
  font-size: 0.9rem;
  margin: -0.5rem 0 1rem 0;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.cancel-btn,
.confirm-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: #ecf0f1;
  color: #35495e;
}

.cancel-btn:hover:not(:disabled) {
  background: #d5dbdb;
}

.confirm-btn {
  background: #42b883;
  color: white;
}

.confirm-btn:hover:not(:disabled) {
  background: #35495e;
}

.delete-confirm-btn {
  background: #e74c3c;
}

.delete-confirm-btn:hover:not(:disabled) {
  background: #c0392b;
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
