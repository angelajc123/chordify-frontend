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

onMounted(async () => {
    const response = await getProgression(PROGRESSION_ID)
    console.log(response)

    if ("error" in response) {
        error.value = response.error
        return
    }

    progression.value = response.progression
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
  margin: 0;
}
</style>
