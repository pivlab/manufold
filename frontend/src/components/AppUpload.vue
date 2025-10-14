<script setup lang="ts">
import { computed, ref, useTemplateRef, watchEffect } from "vue";
import { useEventListener } from "@vueuse/core";
import { LoaderCircle } from "lucide-vue-next";
import AppButton from "@/components/AppButton.vue";
import { parseFile, type Upload } from "@/util/upload";

type Props = {
  /** file types to accept */
  accept: string[];
  /** what element user can drag/drop files onto */
  dropZone?: HTMLElement | null;
  /** tooltip directive */
  tooltip?: unknown;
};

const { dropZone = document.body, tooltip = null } = defineProps<Props>();

type Emits = {
  dragging: [boolean];
  files: [Upload[]];
};

const emit = defineEmits<Emits>();

type Slots = {
  default: [{ uploading: boolean }];
};

defineSlots<Slots>();

const buttonElement = useTemplateRef("buttonElement");
/** actual file input element */
const inputElement = useTemplateRef("inputElement");

/** reactive drop zone */
const _dropzone = computed(
  () => dropZone ?? buttonElement.value?.element ?? document.body,
);

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
  if (inputElement.value) inputElement.value.value = "";
};

/** on upload button click */
const onClick = () => inputElement.value?.click();

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
  <AppButton
    ref="buttonElement"
    v-tooltip="tooltip"
    design="primary"
    :disabled="uploading"
    @click="onClick"
  >
    <LoaderCircle v-if="uploading" class="animate-spin" />
    <slot v-else />
  </AppButton>
  <input
    ref="inputElement"
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
