<script setup>
import { ref } from 'vue'
import ProgressionSidebar from './ProgressionSidebar.vue'
import { useRouter } from 'vue-router'
import { createProgression } from '../api/progression.js'
import { initializeSettings } from '../api/playback.js'
import { initializePreferences } from '../api/suggest.js'

const router = useRouter()
const isSidebarCollapsed = ref(false)
const progressionName = ref('')
const creating = ref(false)
const error = ref(null)

const handleProgressionSelected = (progressionId) => {
  router.push({ name: 'progression', params: { id: progressionId } })
}

const handleSidebarCollapsed = (collapsed) => {
  isSidebarCollapsed.value = collapsed
}

const handleCreateProgression = async () => {
  if (!progressionName.value.trim()) {
    return
  }
  
  creating.value = true
  error.value = null
  
  try {
    // Create the progression
    const createResponse = await createProgression(progressionName.value.trim())
    
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
    
    // Navigate to the new progression
    router.push({ name: 'progression', params: { id: progressionId } })
  } catch (err) {
    error.value = 'Failed to create progression'
    creating.value = false
  }
}

const handleKeyPress = (event) => {
  if (event.key === 'Enter') {
    handleCreateProgression()
  }
}
</script>

<template>
  <div class="home-page">
    <ProgressionSidebar 
      @progressionSelected="handleProgressionSelected"
      @collapsed="handleSidebarCollapsed"
    />
    
    <div class="home-content" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
      <div class="hero">
        <h1 class="title">Chordify</h1>
        <p class="subtitle">Build and explore chord progressions</p>
        <div class="create-progression">
          <div class="input-container">
            <input 
              v-model="progressionName"
              @keypress="handleKeyPress"
              type="text" 
              placeholder="Enter progression name..."
              class="progression-input"
              :disabled="creating"
            />
            <button 
              @click="handleCreateProgression" 
              class="create-btn"
              :disabled="creating || !progressionName.trim()"
              title="Create progression"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
          <p v-if="error" class="error-message">{{ error }}</p>
          <p class="helper-text">Or select a progression from the sidebar</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  display: flex;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.home-content {
  flex: 1;
  margin-left: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: margin-left 0.3s ease;
}

.home-content.sidebar-collapsed {
  margin-left: 0;
}

.hero {
  text-align: center;
  padding: 3rem;
  max-width: 800px;
}

.title {
  font-size: 6rem;
  font-weight: bold;
  background: linear-gradient(135deg, #42b883 0%, #35495e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1rem;
  animation: fadeInUp 0.8s ease-out;
}

.subtitle {
  font-size: 1.8rem;
  color: #35495e;
  margin-bottom: 3rem;
  animation: fadeInUp 0.8s ease-out 0.2s both;
}

.create-progression {
  animation: fadeInUp 0.8s ease-out 0.4s both;
  width: 100%;
  max-width: 600px;
}

.input-container {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.progression-input {
  flex: 1;
  padding: 1rem 1.5rem;
  font-size: 1.1rem;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  color: #35495e;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.progression-input:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 4px 16px rgba(66, 184, 131, 0.2);
}

.progression-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.progression-input::placeholder {
  color: #95a5a6;
}

.create-btn {
  width: 60px;
  height: 60px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #42b883 0%, #35495e 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.create-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(66, 184, 131, 0.3);
}

.create-btn:active:not(:disabled) {
  transform: translateY(0);
}

.create-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  color: #e74c3c;
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
  text-align: center;
}

.helper-text {
  font-size: 1rem;
  color: #95a5a6;
  text-align: center;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .home-content {
    margin-left: 240px;
  }
  
  .title {
    font-size: 4rem;
  }
  
  .subtitle {
    font-size: 1.4rem;
  }
  
  .progression-input {
    font-size: 1rem;
    padding: 0.875rem 1.25rem;
  }
  
  .create-btn {
    width: 50px;
    height: 50px;
  }
}

@media (max-width: 480px) {
  .home-content {
    margin-left: 0;
  }
  
  .title {
    font-size: 3rem;
  }
  
  .subtitle {
    font-size: 1.2rem;
  }
}
</style>
