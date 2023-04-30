<script setup lang="ts">
import { vOnClickOutside } from '@vueuse/components'
import { reactive, ref, watchEffect } from 'vue'

const props = withDefaults(defineProps<{ color: 'dark' | 'light' }>(), { color: 'dark' })
const showTooltip = ref(false)
const arrowSize = 10
const offset = -2
const tooltipRef = ref<HTMLElement | null>(null)
const referenceElement = ref<HTMLElement | null>(null)
const tooltipSize = reactive({ width: 0, height: 0 })

watchEffect(() => {
  if (!tooltipRef.value) return
  const observer = new ResizeObserver(() => {
    if (!tooltipRef.value) return
    tooltipSize.width = tooltipRef.value!.clientWidth
    tooltipSize.height = tooltipRef.value!.clientHeight
  })
  observer.observe(tooltipRef.value)
  return () => observer.unobserve(tooltipRef.value!)
})
</script>

<template>
  <div class="relative">
    <button ref="referenceElement" @click="() => (showTooltip = !showTooltip)" type="button">
      ⓘ
    </button>
    <div
      v-if="showTooltip"
      class="absolute"
      v-on-click-outside="
        (e) => {
          if (e?.target !== referenceElement) showTooltip = false
        }
      "
    >
      <div
        v-if="referenceElement"
        class="absolute h-0 w-0 border-[10px] border-solid border-b-transparent border-x-transparent"
        :class="[
          `border-[${arrowSize}px]`,
          { dark: 'border-dark-light', light: 'border-gray-300' }[props.color]
        ]"
        :style="`transform: translateX(${
          Math.round(referenceElement?.clientWidth / 2 - arrowSize) - 1
        }px) translateY(-${arrowSize + referenceElement?.clientHeight + offset}px);`"
      ></div>
      <div
        v-if="referenceElement"
        ref="tooltipRef"
        class="absolute px-2 py-1 rounded-lg text-sm w-52"
        :style="`transform: translateX(-${Math.round(
          tooltipSize.width / 2 - arrowSize
        )}px) translateY(calc(-100% - ${referenceElement?.clientHeight + arrowSize + offset}px));`"
        :class="{ dark: 'bg-dark-light text-white', light: 'bg-gray-300 text-dark' }[props.color]"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
