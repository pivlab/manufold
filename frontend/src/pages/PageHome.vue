<script setup lang="ts">
import { computed, ref, useTemplateRef } from "vue";
import draggableComponent from "vuedraggable";
import { useStorage } from "@vueuse/core";
import {
  Upload as ArrowUp,
  Code,
  Download,
  Lightbulb,
  ListOrdered,
  Paperclip,
  Printer,
  Trash,
  Type,
} from "lucide-vue-next";
import { micromark } from "micromark";
import logo from "@/assets/logo.svg";
import AppBrain from "@/components/AppBrain.vue";
import AppButton from "@/components/AppButton.vue";
import AppUpload from "@/components/AppUpload.vue";
import styles from "@/styles.css?inline";
import { downloadHtml, downloadMd } from "@/util/download";
import {
  imageAccepts,
  imageExtensions,
  textAccepts,
  textExtensions,
  type Upload,
} from "@/util/upload";
import example from "./example.md?raw";

const { VITE_TITLE } = import.meta.env;

/** elements */
const figureElement = useTemplateRef("figureElement");
const inputElement = useTemplateRef("inputElement");
const outputElement = useTemplateRef("outputElement");

/** current input */
const input = useStorage("input", "");

/** current output */
const output = computed(() => micromark(input.value));

/** save output as markdown */
const saveMd = () => downloadMd(output.value, "manuscript");

/** save output as html */
const saveHtml = () => {
  let content = outputElement.value?.outerHTML;
  if (!content) return;
  content = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>${styles}</style>
</head>
<body>
${content}
</body>
</html>
`;
  downloadHtml(content, "manuscript");
};

/** print output as pdf */
const savePdf = () => {
  outputElement.value?.classList.add("print");
  window.print();
  outputElement.value?.classList.remove("print");
};

/** attached files */
const figures = ref<Upload[]>([]);

/** show figures */
const showFigures = ref(false);
</script>

<template>
  <header
    class="bg-secondary border-primary flex flex-wrap items-center justify-between gap-4 border-b-1 p-4"
  >
    <div class="flex flex-wrap items-center gap-2">
      <AppUpload
        tooltip="Upload input file"
        :accept="textAccepts.concat(textExtensions)"
        :drop-zone="inputElement"
        @files="
          (files) => (input = files.map((file) => file.data).join('\n\n'))
        "
      >
        <ArrowUp />
      </AppUpload>

      <AppButton
        v-tooltip="showFigures ? 'Hide figures panel' : 'Show figures planel'"
        :active="showFigures"
        @click="showFigures = !showFigures"
      >
        <Paperclip />
      </AppButton>

      <AppButton v-tooltip="'Try example input'" @click="input = example">
        <Lightbulb />
      </AppButton>
    </div>

    <div
      class="text-primary relative flex items-center gap-4 text-2xl uppercase"
    >
      <img :src="logo" class="h-10" />
      <span>{{ VITE_TITLE }}</span>
      <AppBrain class="absolute inset-0 left-[calc(100%+1rem)] h-10" />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <VDropdown>
        <AppButton v-tooltip="'Download output'" design="primary">
          <Download />
        </AppButton>

        <template #popper>
          <div class="flex flex-wrap items-center gap-2">
            <AppButton v-tooltip="'Markdown'" @click="saveMd">
              <Type />
            </AppButton>
            <AppButton v-tooltip="'HTML'" @click="saveHtml">
              <Code />
            </AppButton>
            <AppButton v-tooltip="'Print to PDF'" @click="savePdf">
              <Printer />
            </AppButton>
          </div>
        </template>
      </VDropdown>
    </div>
  </header>

  <main class="flex h-0 grow gap-4 p-4">
    <aside
      v-show="showFigures"
      ref="figureElement"
      class="flex w-60 shrink-0 resize-x flex-col items-center gap-4 rounded border-1 border-gray-300 bg-gray-50 p-2 transition-[margin,translate]"
    >
      <div class="flex items-center gap-4">
        <b>Figures</b>
        {{ figures.length }}
      </div>

      <div class="flex items-center gap-2">
        <AppUpload
          tooltip="Upload figure"
          :accept="imageAccepts.concat(imageExtensions)"
          :drop-zone="figureElement"
          @files="(files) => (figures = figures.concat(files))"
        >
          <ArrowUp />
        </AppUpload>
        <template v-if="figures.length">
          <AppButton
            v-tooltip="'Auto-name figures 1, 2, 3...'"
            @click="
              figures.forEach(
                (figure, index) => (figure.name = `Figure ${index + 1}`),
              )
            "
          >
            <ListOrdered />
          </AppButton>
          <AppButton v-tooltip="'Delete all figures'" @click="figures = []">
            <Trash />
          </AppButton>
        </template>
      </div>

      <draggableComponent
        v-model="figures"
        item-key="id"
        handle="img"
        class="flex w-full flex-col items-center gap-4 overflow-y-auto"
      >
        <template #item="{ element, index }">
          <div class="flex w-full flex-col gap-2">
            <div class="max-h-60 max-w-full">
              <img
                v-tooltip="`${element.filename}<br>Drag to reorder`"
                :src="element.uri"
                class="h-full w-full cursor-grab object-cover"
              />
            </div>
            <div class="flex gap-2">
              <input v-model="element.name" placeholder="Name" class="grow" />
              <AppButton
                v-tooltip="'Delete figure'"
                @click="figures.splice(index, 1)"
              >
                <Trash />
              </AppButton>
            </div>
          </div>
        </template>
      </draggableComponent>
    </aside>

    <textarea
      ref="inputElement"
      v-model="input"
      placeholder="Start writing your manuscript Markdown here"
      class="w-[50%] shrink-0 resize-x rounded-lg border-1 border-gray-300 p-4"
    />

    <div
      ref="outputElement"
      class="flex flex-grow flex-col gap-4 rounded-lg border-1 border-gray-300 bg-gray-50 p-4"
      v-html="output"
    />
  </main>
</template>

<style scoped>
@reference "tailwindcss";

main > * {
  @apply overflow-y-auto;
}
</style>
