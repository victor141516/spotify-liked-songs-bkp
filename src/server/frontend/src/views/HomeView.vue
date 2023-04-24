<script setup lang="ts">
import SpotifyButton from '@/components/SpotifyButton.vue'
</script>

<template>
  <div class="flex flex-col items-center gap-12">
    <div class="flex flex-col gap-8 items-center">
      <h1>Make Spotify Liked playlist shareable</h1>
      <div id="explanation-wrapper">
        <p>
          Spotify has this annoying issue that doesn't allow you to share your "Liked Songs" list
        </p>
        <p>I made this tool to help you with that</p>
        <p>
          It'll create a new playlist on your account and will keep that playlist in sync with your
          Liked Songs list
        </p>
        <p>
          The list is updated regularly, but it's not instant, so you'll have to wait some time
          since you change your liked songs list. I'll try to keep that "regularly" as low as
          possible
        </p>
        <p>
          The tool will also add a snapshot of the liked songs list each day, for the last 5 days.
          I'll add a toggle for this in the future
        </p>
      </div>
      <SpotifyButton type="link" href="/auth/login">Authorize with Spotify</SpotifyButton>
    </div>
    <div class="flex flex-col gap-8">
      <h2>I don't want to use this tool anymore</h2>
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
