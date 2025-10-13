<script setup lang="ts">
import { computed, ref, useTemplateRef, watchEffect } from "vue";
import { useEventListener } from "@vueuse/core";
import { LoaderCircle, Upload } from "lucide-vue-next";
import AppButton from "@/components/AppButton.vue";
import { parseFile } from "@/util/upload";

type Props = {
  /** file types to accept */
  accept: string[];
  /** what element user can drag/drop files onto */
  dropZone?: HTMLElement | null;
  /** tooltip directive */
  tooltip?: unknown;
};

const { dropZone = document.body, tooltip = null } = defineProps<Props>();

/** reactive drop zone */
const _dropzone = computed(() => dropZone ?? document.body);

type Emits = {
  dragging: [boolean];
  files: [{ text: string; filename: string }[]];
};

const emit = defineEmits<Emits>();

type Slots = {
  default: [{ uploading: boolean }];
};

defineSlots<Slots>();

/** actual file input element */
const input = useTemplateRef("input");

/** dragging state */
const dragging = ref(false);

/** uploading status */
const uploading = ref(false);

/** when dragging state changes */
watchEffect(() => {
  emit("dragging", dragging.value);
  dropZone?.classList[dragging.value ? "add" : "remove"]("dragging");
});

/** upload file(s) */
const onLoad = async (fileList: FileList | null) => {
  if (!fileList) return;

  uploading.value = true;

  /** parse each file */
  const files =
    (await Promise.all([...fileList].map(parseFile)).catch(console.warn)) ?? [];

  uploading.value = false;

  /** notify parent of new files */
  if (files) emit("files", files);

  /** reset file input so the same file could be re-selected */
  if (input.value) input.value.value = "";
};

/** on upload button click */
const onClick = () => input.value?.click();

/** on file input change */
const onChange = (event: Event) =>
  onLoad((event.target as HTMLInputElement).files ?? null);

/** track drag & drop state */
useEventListener(_dropzone, "dragenter", () => (dragging.value = true));
useEventListener(_dropzone, "dragleave", () => (dragging.value = false));
useEventListener(_dropzone, "dragover", (event) => event.preventDefault());

/** when file dropped on drop zone */
useEventListener(_dropzone, "drop", (event) => {
  event.preventDefault();
  event.stopPropagation();
  dragging.value = false;
  onLoad(event.dataTransfer?.files ?? null);
});
</script>

<template>
  <AppButton v-tooltip="tooltip" :disabled="uploading" @click="onClick">
    <LoaderCircle v-if="uploading" class="spin" />
    <Upload v-else />
  </AppButton>
  <input
    ref="input"
    class="sr-only"
    type="file"
    :accept="accept.join(',')"
    multiple
    @change="onChange"
  />
</template>

<style>
@reference "tailwindcss";
@reference "@/styles.css";

.dragging {
  @apply outline-primary opacity-50 outline-3 outline-offset-4 outline-dashed;
}
</style>
