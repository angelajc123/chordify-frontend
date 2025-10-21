<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div id="app">
    <header>
      <h1>Chordify Frontend</h1>
    </header>
    <main>
      <div class="card">
        <button @click="count++">Count is {{ count }}</button>
        <p>
          Edit <code>src/App.vue</code> to get started.
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped>
header {
  padding: 2rem;
  text-align: center;
}

h1 {
  font-size: 3rem;
  font-weight: bold;
  background: linear-gradient(135deg, #42b883 0%, #35495e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

main {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
}

.card {
  padding: 2rem;
  text-align: center;
}

button {
  background-color: #42b883;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #35495e;
}

code {
  background-color: #f4f4f4;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: monospace;
}

p {
  margin-top: 1rem;
  color: #666;
}
</style>
