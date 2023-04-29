<script setup lang="ts">
import SpotifyButton from '@/components/SpotifyButton.vue'
import { onMounted, reactive, ref, watchEffect } from 'vue'

const RESULT_MESSAGES = {
  credentials_revoked: 'You thought you could leve without saying goodbye?',
  credentials_saved:
    'Now your liked songs playlist will be kept in sync with your new playlist 🎉. It might take a few minutes for the first sync to happen. You can close this window now.'
} as const
const ERROR_MESSAGES = {
  could_not_save_credentials: 'Could not save your credentials',
  refresh_error: 'Error getting your user information'
} as const

const params = ref<null | {
  get: ((key: 'ok') => 'true' | 'false' | null) &
    ((key: 'result') => keyof typeof RESULT_MESSAGES | null) &
    ((key: 'error') => keyof typeof ERROR_MESSAGES | null)
}>()

onMounted(() => {
  params.value = new URLSearchParams(location.search) as any
})

const state = reactive({
  errorMessage: '',
  resultMessage: '',
  showGoodbye: false
})

watchEffect(() => {
  if (!params.value) return
  const ok = params.value.get('ok') === 'true'

  if (ok) {
    const result = params.value.get('result')
    state.resultMessage = RESULT_MESSAGES[result!] ?? result!
    if (result === 'credentials_revoked') {
      state.showGoodbye = true
    }
  } else {
    const errorCode = params.value.get('error')
    state.errorMessage = ERROR_MESSAGES[errorCode!] ?? errorCode!
  }
})
</script>

<template>
  <div v-if="state.resultMessage" class="text-center flex flex-col items-center gap-5">
    <h1 id="header" class="text-center">Done!</h1>
    <p>{{ state.resultMessage }}</p>
    <RouterLink :to="{ name: 'config' }">
      <SpotifyButton type="button">Go to Settings</SpotifyButton>
    </RouterLink>
    <video
      v-if="state.showGoodbye"
      muted
      loop
      autoplay="true"
      preload="auto"
      playsinline="true"
      src="/goodbye.mp4"
    />
  </div>
  <div v-if="state.errorMessage" class="text-center flex flex-col items-center gap-5">
    <h1 class="text-center">Something went wrong 🙁</h1>
    <p>
      Please
      <a href="https://github.com/victor141516/spotify-liked-songs-bkp/issues/new/choose"
        >open an issue</a
      >
      and attach the error bellow
    </p>
    <code class="text-lg">{{ state.errorMessage }}</code>
  </div>
</template>
