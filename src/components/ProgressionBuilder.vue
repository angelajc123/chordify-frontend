<script setup>
import { ref, onMounted } from 'vue'
import { getProgression, addSlot } from '../api/progression.js'

const progression = ref({
    id: '',
    name: '',
    chords: []
})

const error = ref(null)
const loading = ref(true)
const selectedSlot = ref(null)

// Hard-coded progression ID
const PROGRESSION_ID = '019a08bc-6d5f-702e-bd63-ff7fb3bb0d21'

const loadProgression = async (progressionId) => {
    const response = await getProgression(progressionId)
    console.log(response)

    if ("error" in response) {
        error.value = response.error
        return
    }

    progression.value.id = response.progression._id
    progression.value.name = response.progression.name
    progression.value.chords = response.progression.chordSequence
    loading.value = false
}

const handleSlotClick = (index) => {
    if (selectedSlot.value === index) {
        selectedSlot.value = null // Unselect if already selected
    } else {
        selectedSlot.value = index // Select the slot
    }
}

const handleAddSlot = async () => {
    const response = await addSlot(progression.value.id)
    console.log('addSlot response:', response)
    
    if ("error" in response) {
        error.value = response.error
        return
    }
    
    // Reload the progression to get updated data
    await loadProgression(PROGRESSION_ID)
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
      <div v-if="loading" class="loading">
        Loading...
      </div>
      
      <div v-else-if="error" class="error">
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
            <div v-for="(chord, index) in progression.chords" :key="index" class="bar-cell">
              <div 
                class="slot" 
                :class="{ 
                  'slot-empty': !chord.chord,
                  'slot-selected': selectedSlot === index
                }"
                @click="handleSlotClick(index)"
              >
                {{ chord.chord || 'Empty' }}
              </div>
            </div>
            <div class="bar-cell">
              <button class="add-chord-btn" @click="handleAddSlot">+</button>
            </div>
            <div v-for="n in (7 - progression.chords.length)" :key="`empty-${n}`" class="bar-cell"></div>
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
  cursor: pointer;
  transition: all 0.2s;
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
</style>
