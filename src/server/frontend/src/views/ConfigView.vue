<script setup lang="ts">
import loadingImage from '@/assets/loading.svg?url'
import tickImage from '@/assets/tick.svg?url'
import BaseCard from '@/components/BaseCard.vue'
import SpotifyButton from '@/components/SpotifyButton.vue'
import { onMounted, reactive } from 'vue'

interface Data {
  snapshotIntervalEnabled: boolean
  snapshotInterval: number
  defaultPlaylistSyncInterval: number
}

const formDataState = reactive<Data>({
  snapshotIntervalEnabled: true,
  snapshotInterval: 1,
  defaultPlaylistSyncInterval: 10
})
const state = reactive({
  submitDisabled: false,
  dataFetched: false,
  sendingRequest: false,
  requestSent: false
})

onMounted(async () => {
  if (import.meta.env.DEV) {
    state.dataFetched = true
    return
  }
  const data = await fetch('/api/config').then((res) => res.json())
  formDataState.snapshotInterval = data.snapshotInterval
  formDataState.snapshotIntervalEnabled = data.snapshotIntervalEnabled
  formDataState.defaultPlaylistSyncInterval = data.defaultPlaylistSyncInterval
  state.dataFetched = true
})

const onSubmit = async (e: Event) => {
  const form = e.target as HTMLFormElement
  const disabledElements = form.querySelectorAll('input[disabled]')
  disabledElements.forEach((el) => el.removeAttribute('disabled'))
  const formData = new FormData(form)
  const data: any = Object.fromEntries(formData.entries())
  disabledElements.forEach((el) => el.setAttribute('disabled', ''))
  data.snapshotIntervalEnabled = data.snapshotIntervalEnabled === 'on'
  try {
    data.snapshotInterval = Number.parseInt(data.snapshotInterval ?? '1') ?? 1
  } catch (e) {
    data.snapshotInterval = 1
  }
  try {
    data.defaultPlaylistSyncInterval =
      Number.parseInt(data.defaultPlaylistSyncInterval ?? '10') ?? 10
  } catch (e) {
    data.defaultPlaylistSyncInterval = 10
  }

  state.sendingRequest = true
  if (import.meta.env.DEV) {
    // alert(`Send config: \n${JSON.stringify(data, null, 2)}`)
    await new Promise((resolve) => setTimeout(resolve, 1000))
  } else {
    const result = await fetch('/api/config', {
      method: 'POST',
      body: JSON.stringify(data as Data),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then((res) => res.json())
    console.log('config save result', result)
  }
  state.sendingRequest = false
  state.requestSent = true
  setTimeout(() => {
    state.requestSent = false
  }, 1000)
}
</script>

<template>
  <BaseCard v-if="state.dataFetched">
    <form @submit.prevent="onSubmit" class="flex flex-col gap-4 items-center">
      <div class="flex flex-col gap-2">
        <fieldset>
          <legend class="text-xl mb-1">Sync</legend>
          <div>
            <input
              v-model="formDataState.defaultPlaylistSyncInterval"
              type="number"
              min="10"
              step="1"
              id="defaultPlaylistSyncInterval"
              name="defaultPlaylistSyncInterval"
              class="w-12 text-center pl-4"
            />
            <label for="defaultPlaylistSyncInterval">Time between syncs (minutes)</label>
          </div>
        </fieldset>
        <fieldset class="mt-4">
          <legend class="text-xl mb-1">Snapshots</legend>
          <div>
            <input
              v-model="formDataState.snapshotIntervalEnabled"
              type="checkbox"
              id="snapshotIntervalEnabled"
              name="snapshotIntervalEnabled"
              class="w-12 text-center"
            />
            <label for="snapshotIntervalEnabled">Enable snapshots</label>
          </div>
          <div>
            <input
              :disabled="!formDataState.snapshotIntervalEnabled"
              v-model="formDataState.snapshotInterval"
              type="number"
              min="1"
              step="1"
              id="snapshotInterval"
              name="snapshotInterval"
              class="w-12 text-center disabled:opacity-50 peer pl-4"
            />
            <label for="snapshotInterval" class="peer-disabled:opacity-50"
              >Time between snapshots (days)</label
            >
          </div>
        </fieldset>
      </div>
      <div class="w-40 mx-auto flex">
        <SpotifyButton
          class="mx-auto !h-11 transition-all flex items-center"
          :class="state.sendingRequest || state.requestSent ? '!w-11 !p-0' : '!w-full'"
          :disabled="state.submitDisabled || state.sendingRequest || state.requestSent"
          type="button"
          :submit="true"
        >
          <img
            :src="state.sendingRequest ? loadingImage : tickImage"
            class="h-4 mx-auto transition-all"
            :class="[
              state.sendingRequest || state.requestSent ? 'opacity-100' : 'opacity-0 w-0 h-0',
              state.sendingRequest ? 'translate-y-[0.1rem]' : undefined,
              state.requestSent ? 'pl-[5%]' : undefined
            ]"
          />
          <span v-if="!(state.sendingRequest || state.requestSent)" class="w-full mx-auto"
            >Save</span
          ></SpotifyButton
        >
      </div>
    </form>
  </BaseCard>
</template>
