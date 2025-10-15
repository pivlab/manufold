<script setup lang="ts">
import type { Upload } from "@/util/upload";

type Props = { upload: Upload };

defineProps<Props>();
</script>

<template>
  <div
    v-tooltip="[upload.filename.toLowerCase()].filter(Boolean).join('<br>')"
    class="flex items-center rounded-full bg-current/5 p-1 text-xs"
  >
    {{ upload.extension }}
  </div>
</template>
