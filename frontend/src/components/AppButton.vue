<script setup lang="ts">
import { useTemplateRef } from "vue";

type Props = {
  design?: "primary" | "secondary" | "active";
};

const { design = "secondary" } = defineProps<Props>();

const element = useTemplateRef("element");

defineExpose({ element });
</script>

<template>
  <button
    ref="element"
    class="relative min-h-8 min-w-8! rounded-full"
    :class="[
      design === 'primary' || design === 'active'
        ? 'bg-primary text-white hover:bg-slate-700'
        : 'text-primary hover:text-slate-700',
    ]"
  >
    <slot />
  </button>
</template>

<style scoped>
@reference "tailwindcss";

button:has(span) {
  @apply px-2;
}
</style>
