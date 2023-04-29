<script setup lang="ts">
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
  dataFetched: false
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
  state.submitDisabled = true
  const result = await fetch('/api/config', {
    method: 'POST',
    body: JSON.stringify(data as Data),
    headers: {
      'Content-Type': 'application/json'
    }
  }).then((res) => res.json())
  console.log('config save result', result)
  state.submitDisabled = false
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
      <SpotifyButton
        :disabled="state.submitDisabled"
        type="button"
        :submit="true"
        class="bg-spotify"
        >Save</SpotifyButton
      >
    </form>
  </BaseCard>
</template>
