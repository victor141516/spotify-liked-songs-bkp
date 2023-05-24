<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { useParallax } from '@vueuse/core'
import { computed, reactive, ref, type CSSProperties } from 'vue'

const parallaxTarget = ref<HTMLElement | null>(null)
const parallax = reactive(
  useParallax(globalThis.document?.body, {
    deviceOrientationTiltAdjust: (i) => i * 2,
    deviceOrientationRollAdjust: (i) => i * 2
  })
)
const layerBase: CSSProperties = {
  transition: '.3s ease-out all'
}
const layer0 = computed(() => ({
  ...layerBase,
  transform: `translateX(${parallax.tilt * 10}px) translateY(${parallax.roll * 10}px) scale(1.33)`
}))

const layer1 = computed(() => ({
  ...layerBase,
  transform: `translateX(${parallax.tilt * 20}px) translateY(${parallax.roll * 20}px) scale(1.33)`
}))

const layer2 = computed(() => ({
  ...layerBase,
  transform: `translateX(${parallax.tilt * 30}px) translateY(${parallax.roll * 30}px) scale(1.33)`
}))
</script>

<template>
  <a href="/" class="w-full" ref="parallaxTarget">
    <div class="hidden md:flex items-center justify-center mx-auto">
      <img
        src="../assets/logo-big-background.png"
        class="w-40"
        alt="Liked.Party logo background"
        :style="layer0"
      />
      <img
        src="../assets/logo-big-foreground.png"
        class="w-[30rem] -ml-16 -mb-4"
        alt="Liked.Party logo foreground"
        :style="layer1"
      />
      <div class="-translate-x-64 translate-y-16">
        <img src="../assets/spotify.svg" alt="Spotify logo" class="max-w-[100px]" :style="layer2" />
      </div>
    </div>
    <div class="md:hidden flex items-center justify-center -mr-32">
      <img
        src="../assets/logo-big-background.png"
        class="w-40"
        alt="Liked.Party logo background"
        :style="layer0"
      />

      <img
        src="../assets/logo-small-foreground.png"
        alt="Liked.Party logo"
        class="w-[120px] -ml-32"
        :style="layer1"
      />
      <img
        src="../assets/spotify.svg"
        alt="Spotify logo"
        class="max-w-[100px] -mb-28 ml-8"
        :style="layer2"
      />
    </div>
  </a>
</template>
