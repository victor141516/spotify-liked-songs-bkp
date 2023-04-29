<script setup lang="ts">
import SpotifyButton from '@/components/SpotifyButton.vue'
const lines = [
  'Spotify has this annoying issue that doesn\'t allow you to share your "Liked Songs" list',
  'I made this tool to help you with that',
  "It'll create a new playlist on your account and will keep that playlist in sync with your Liked Songs list",
  "The list is updated regularly, but it's not instant, so you'll have to wait some time since you change your liked songs list. I'll try to keep that \"regularly\" as low as possible",
  "The tool will also add a snapshot of the liked songs list each day, for the last 5 days. I'll add a toggle for this in the future"
]
</script>

<template>
  <div class="flex flex-col items-center gap-12">
    <div class="flex flex-col gap-8 items-center">
      <h1 class="text-center">Make Spotify Liked playlist shareable</h1>
      <div id="explanation-wrapper">
        <p
          v-for="line of lines"
          :key="line"
          class="py-2 px-5 first:pt-4 last:pb-4 border-b last:border-none border-solid border-dark"
        >
          {{ line }}
        </p>
      </div>
      <SpotifyButton type="link" href="/auth/login">Authorize with Spotify</SpotifyButton>
    </div>
    <div class="flex flex-col gap-8">
      <h2 class="text-center">I don't want to use this tool anymore</h2>
      <div class="flex flex-col gap-4">
        <p>
          That's sad 😢. Just click here to
          <SpotifyButton type="link" href="/auth/revoke">disconnect the app</SpotifyButton>
        </p>
        <p>
          If you want to give some feedback please
          <a href="https://github.com/victor141516/spotify-liked-songs-bkp/issues/new/choose"
            >open an issue</a
          >
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
#stop-tool {
  @apply mt-20 text-center flex flex-col items-center gap-5;
}

#explanation-wrapper {
  @apply flex flex-col bg-dark-light max-w-lg rounded-3xl;
}
</style>
