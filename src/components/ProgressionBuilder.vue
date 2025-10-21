<script setup>
import { ref, onMounted } from 'vue'
import { getProgression } from '../api/progression.js'

const progression = ref({
  name: '',
  id: '',
  chords: []
})

const error = ref(null)

// Hard-coded progression ID
const PROGRESSION_ID = '019a08bc-6d5f-702e-bd63-ff7fb3bb0d21'

const loadProgression = async (progressionId) => {
    const response = await getProgression(progressionId)
    console.log(response)

    if ("error" in response) {
        error.value = response.error
        return
    }

    progression.value = response.progression
}

onMounted(async () => {
    await loadProgression(PROGRESSION_ID)
})
</script>

<template>
  <div class="progression-builder">
    <header class="header">
      <h1>Chordify</h1>
    </header>
    
    <main class="content">
      <div v-if="error" class="error">
        {{ error }}
      </div>
      
      <div v-else class="progression-info">
        <h2>{{ progression.name }}</h2>
        
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
            <div class="bar-cell">
              <button class="add-chord-btn">+</button>
            </div>
            <div class="bar-cell"></div>
            <div class="bar-cell"></div>
            <div class="bar-cell"></div>
            <div class="bar-cell"></div>
            <div class="bar-cell"></div>
            <div class="bar-cell"></div>
            <div class="bar-cell"></div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.progression-builder {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
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

.error {
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
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
</style>
