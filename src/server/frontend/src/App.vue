<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <main class="md:mt-[10vh]">
    <a href="/" class="relative">
      <img src="./assets/logo-big.png" alt="Liked.Party logo" class="hidden md:block max-w-lg" />
      <img src="./assets/logo-small.png" alt="Liked.Party logo" class="md:hidden max-w-[200px]" />
      <img
        src="/spotify.svg"
        alt="Spotify logo"
        class="max-w-[100px] absolute right-0 md:right-1/2 bottom-0 translate-x-16 md:translate-x-1/2"
      />
    </a>
    <RouterView />
  </main>
</template>
