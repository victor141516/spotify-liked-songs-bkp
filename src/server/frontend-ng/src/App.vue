<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <main class="mt-4 md:mt-[10vh]">
    <a href="/">
      <img src="/spotify.svg" alt="Spotify logo" id="spotify-logo" />
    </a>
    <RouterView />
  </main>
</template>
