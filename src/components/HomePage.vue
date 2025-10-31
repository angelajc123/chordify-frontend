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
  background: linear-gradient(135deg, #050816 0%, #0a0e27 50%, #1a1f3a 100%);
  position: relative;
  overflow: hidden;
}

.home-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 217, 255, 0.03) 2px,
      rgba(0, 217, 255, 0.03) 4px
    );
  pointer-events: none;
  animation: scanlines 8s linear infinite;
}

@keyframes scanlines {
  0% { transform: translateY(0); }
  100% { transform: translateY(10px); }
}

.home-content {
  flex: 1;
  margin-left: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: margin-left 0.3s ease;
  position: relative;
  z-index: 1;
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
  font-family: 'Orbitron', sans-serif;
  font-size: 6rem;
  font-weight: 900;
  background: linear-gradient(135deg, #ff006e 0%, #8b5cf6 50%, #00d9ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1rem;
  animation: fadeInUp 0.8s ease-out, glow 2s ease-in-out infinite alternate;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  filter: drop-shadow(0 0 20px rgba(255, 0, 110, 0.5));
}

@keyframes glow {
  from {
    filter: drop-shadow(0 0 20px rgba(255, 0, 110, 0.5));
  }
  to {
    filter: drop-shadow(0 0 30px rgba(139, 92, 246, 0.8));
  }
}

.subtitle {
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.8rem;
  font-weight: 500;
  color: #00d9ff;
  margin-bottom: 3rem;
  animation: fadeInUp 0.8s ease-out 0.2s both;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  text-shadow: 0 0 10px rgba(0, 217, 255, 0.5);
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
  font-family: 'Rajdhani', sans-serif;
  font-weight: 500;
  border: 2px solid #8b5cf6;
  border-radius: 12px;
  background: rgba(15, 21, 53, 0.8);
  color: #e0e7ff;
  transition: all 0.3s;
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.3), inset 0 0 10px rgba(139, 92, 246, 0.1);
  backdrop-filter: blur(10px);
}

.progression-input:focus {
  outline: none;
  border-color: #ff006e;
  box-shadow: 0 0 30px rgba(255, 0, 110, 0.6), inset 0 0 15px rgba(255, 0, 110, 0.2);
  background: rgba(15, 21, 53, 0.95);
}

.progression-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progression-input::placeholder {
  color: #94a3b8;
  font-weight: 400;
}

.create-btn {
  width: 60px;
  height: 60px;
  border: 2px solid #ff006e;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff006e 0%, #8b5cf6 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  box-shadow: 0 0 20px rgba(255, 0, 110, 0.5);
  position: relative;
  overflow: hidden;
}

.create-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.create-btn:hover:not(:disabled)::before {
  width: 300px;
  height: 300px;
}

.create-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 0 30px rgba(255, 0, 110, 0.8), 0 0 50px rgba(139, 92, 246, 0.5);
  border-color: #00d9ff;
}

.create-btn:active:not(:disabled) {
  transform: translateY(0);
}

.create-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  color: #ff006e;
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
  text-align: center;
  text-shadow: 0 0 10px rgba(255, 0, 110, 0.5);
  font-weight: 600;
}

.helper-text {
  font-size: 1rem;
  color: #94a3b8;
  text-align: center;
  font-weight: 400;
  letter-spacing: 0.05em;
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
