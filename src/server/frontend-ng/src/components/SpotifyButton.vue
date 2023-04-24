<script setup lang="ts">
defineProps<{ type: 'link' | 'button'; href?: string; submit?: boolean; disabled?: boolean }>()
defineEmits<{ (e: 'click'): void }>()
</script>

<template>
  <component
    :is="$props.type === 'button' ? 'button' : 'a'"
    class="bg-spotify text-white border-none rounded-full px-6 py-3 font-semibold no-underline w-fit"
    :href="$props.type === 'link' && $props.href"
    :type="$props.type === 'button' && $props.submit ? 'submit' : 'button'"
    :disabled="$props.disabled"
    @click="() => $props.type === 'button' && $emit('click')"
  >
    <slot />
  </component>
</template>
