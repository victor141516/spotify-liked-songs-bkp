<script setup lang="ts">
import SpotifyButton from '@/components/SpotifyButton.vue'
import { onMounted } from 'vue'

// TODO: refactor this vanilla js to vue
onMounted(() => {
  const params = new URLSearchParams(location.search)

  if (params.get('ok') !== 'true') {
    const errorCode = params.get('error')
    const errorMessageElement = document.getElementById('error-message')
    const errorElement = document.getElementById('error')
    errorMessageElement!.innerText =
      {
        could_not_save_credentials: 'Could not save your credentials',
        refresh_error: 'Error getting your user information'
      }[errorCode!] ?? errorCode!
    errorElement!.classList.remove('hidden')
  } else {
    const resultMessageElement = document.getElementById('result-message')
    const resultElement = document.getElementById('result')
    const result = params.get('result')
    resultMessageElement!.innerText =
      {
        credentials_revoked: 'You thought you could leve without saying goodbye?',
        credentials_saved:
          'Now your liked songs playlist will be kept in sync with your new playlist 🎉. It might take a few minutes for the first sync to happen. You can close this window now.'
      }[result!] ?? result!
    resultElement!.classList.remove('hidden')
    if (result === 'credentials_revoked') {
      document.getElementById('goodbye')!.classList.remove('hidden')
    }
  }
})
</script>

<template>
  <div id="result" class="hidden">
    <h1 id="header" class="text-center">Done!</h1>
    <p id="result-message"></p>
    <RouterLink :to="{ name: 'config' }">
      <SpotifyButton type="button">Go to Settings</SpotifyButton>
    </RouterLink>
    <video
      id="goodbye"
      class="hidden"
      muted
      loop
      autoplay="true"
      preload="auto"
      playsinline="true"
      src="/goodbye.mp4"
    />
  </div>
  <div id="error" class="hidden">
    <h1 class="text-center">Something went wrong 🙁</h1>
    <p>
      Please
      <a href="https://github.com/victor141516/spotify-liked-songs-bkp/issues/new/choose"
        >open an issue</a
      >
      and attach the error bellow
    </p>
    <code id="error-message" class="text-lg"></code>
  </div>
</template>

<style scoped>
#result:not(.hidden),
#error:not(.hidden) {
  @apply text-center flex flex-col items-center gap-5;
}
</style>
