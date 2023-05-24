<script setup lang="ts">
import { RouterView } from 'vue-router'
import Header from './components/Header.vue'
</script>

<template>
  <main class="md:mt-[10vh] md:w-2/3 mx-auto">
    <div class="w-full my-4">
      <Header />
    </div>
    <RouterView />
  </main>
</template>
