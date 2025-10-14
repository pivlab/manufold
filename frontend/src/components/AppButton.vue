<script setup lang="ts">
import { useTemplateRef } from "vue";

type Props = {
  design?: "primary" | "secondary";
  active?: boolean;
};

const { design = "secondary", active = false } = defineProps<Props>();

const element = useTemplateRef("element");

defineExpose({ element });
</script>

<template>
  <button
    ref="element"
    class="min-h-10 min-w-10! rounded-full text-xl"
    :class="[
      active ? 'border-2 border-current' : '',
      design === 'primary'
        ? 'bg-primary text-white hover:bg-gray-700'
        : 'text-primary hover:text-gray-700',
    ]"
  >
    <slot />
  </button>
</template>
