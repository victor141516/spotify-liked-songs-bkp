<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <main class="md:mt-[10vh]">
    <a href="/">
      <img src="/spotify.svg" alt="Spotify logo" id="spotify-logo" class="max-w-full" />
    </a>
    <RouterView />
  </main>
</template>
