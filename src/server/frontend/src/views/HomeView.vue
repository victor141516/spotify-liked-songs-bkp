<script setup lang="ts">
import SpotifyButton from '@/components/SpotifyButton.vue'
</script>

<template>
  <div class="flex flex-col items-center gap-32">
    <div class="flex flex-col gap-8 items-center">
      <div class="flex gap-4 items-center">
        <h1 class="text-center flex-[3]">Make Spotify Liked playlist shareable</h1>
        <div class="md:hidden flex-[2]">
          <img
            height="88"
            width="176"
            src="../assets/playlists.png"
            alt="Spotify playlists"
            class="aspect-[2] object-cover object-top"
          />
        </div>
      </div>
      <div class="flex flex-col md:flex-row gap-5 items-center">
        <div id="explanation-wrapper">
          <p
            class="py-2 px-5 first:pt-4 last:pb-4 border-b last:border-none border-solid border-dark"
          >
            Spotify has
            <a
              target="_blank"
              href="https://community.spotify.com/t5/Live-Ideas/Make-quot-Liked-Songs-quot-playlist-shareable/idi-p/4872982"
              class="bg-primary text-white px-1 py-0.5 rounded-md no-underline"
              >this annoying issue</a
            >
            that doesn't allow you to share your "Liked Songs" list
          </p>
          <p
            class="py-2 px-5 first:pt-4 last:pb-4 border-b last:border-none border-solid border-dark"
          >
            This tool will create a new playlist on your account and will keep that playlist in sync
            with your Liked Songs list (it's not instant)
          </p>
        </div>
        <img
          height="241"
          width="208"
          src="../assets/playlists.png"
          alt="Spotify playlists"
          class="hidden md:block w-52"
        />
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
