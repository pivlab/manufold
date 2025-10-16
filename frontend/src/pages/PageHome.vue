<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from "vue";
import draggableComponent from "vuedraggable";
import { useEventListener, useStorage, useTextSelection } from "@vueuse/core";
import {
  Upload as ArrowUp,
  BookX,
  Code,
  Download,
  Feather,
  FileImage,
  GitFork,
  ImageUp,
  LibraryBig,
  Lightbulb,
  ListOrdered,
  Printer,
  Sparkles,
  Trash,
  Type,
} from "lucide-vue-next";
import { micromark } from "micromark";
import { getSession, type SessionResponse } from "@/api/adk";
import { manugen } from "@/api/api";
import logo from "@/assets/logo.svg";
import AppBrain, { think } from "@/components/AppBrain.vue";
import AppButton from "@/components/AppButton.vue";
import { toast } from "@/components/AppToasts";
import AppUpload from "@/components/AppUpload.vue";
import AppUploadBadge from "@/components/AppUploadBadge.vue";
import styles from "@/styles.css?inline";
import { downloadHtml, downloadMd } from "@/util/download";
import { sleep } from "@/util/misc";
import {
  imageAccepts,
  imageExtensions,
  parseFile,
  textAccepts,
  textExtensions,
  type Upload,
} from "@/util/upload";
import example1Fig1 from "./example-1-figure-1.svg?raw";
import example1Fig2 from "./example-1-figure-2.svg?raw";
import example1 from "./example-1.md?raw";
import example2 from "./example-2.md?raw";

const { VITE_TITLE } = import.meta.env;

/** ai service session */
const session = ref<SessionResponse>();

/** establish session with backend */
onMounted(async () => {
  const stopLoading = toast("Connecting to AI service", "loading");
  try {
    session.value = await getSession();
    toast("Connected to AI service", "success");
  } catch (error) {
    console.warn(error);
    toast("Failed to connect to AI service", "error");
  } finally {
    stopLoading();
  }
});

/** elements */
const figureElement = useTemplateRef("figureElement");
const inputElement = useTemplateRef("inputElement");
const outputElement = useTemplateRef("outputElement");

/** for dev */
window.localStorage.clear();

/** current input */
const input = useStorage("input", "");

/** document name */
const name = useStorage("name", "");

/** document name, with fallback */
const nameFallback = computed(() => name.value.trim() || "manuscript");

/** input upload */
const upload = ref<Upload | null>(null);

/** current output */
const output = computed(() => micromark(input.value));

/** upload input file */
const uploadInput = (files: Upload[]) => {
  input.value = files.map((file) => file.data).join("\n\n");
  if (files[0]) {
    name.value = files[0].name;
    upload.value = { ...files[0] };
  }
};

const examples = {
  "Draft from skeleton w/ figs": {
    input: example1,
    figures: [
      { data: example1Fig1, filename: "fig-1.svg", type: "image/svg+xml" },
      { data: example1Fig2, filename: "fig-2.svg", type: "image/svg+xml" },
    ],
    name: "Example Manuscript",
  },
  "Draft from GitHub repo": {
    input: example2,
    figures: [],
    name: "Example Manuscript",
  },
};

/** load example */
const loadExample = async (key: keyof typeof examples) => {
  const example = examples[key];
  input.value = example.input;
  name.value = example.name;
  upload.value = await parseFile(
    new File([example.input], "example.md", {
      type: "text/markdown",
    }),
  );
  figures.value = await Promise.all(
    example.figures.map(({ data, filename, type }) =>
      parseFile(new File([data], filename, { type })),
    ),
  );
  toast("Loaded example", "success");
};

/** currently selected text on page */
const selection = useTextSelection();

/** ai agent actions */
const actions = computed(() => [
  {
    name: "Draft",
    icon: Feather,
    tooltip:
      "Select one or more # Heading 1 sections and content, then click to draft",
    prefix: "",
    enabled: !!selection.text.value.match(/^# [^\n]+$\n+^[^/s#\n]+/m),
  },
  {
    name: "Refine",
    icon: Sparkles,
    tooltip: "Select text, then click to revise and improve",
    prefix: "$REFINE_REQUEST$",
    enabled: !!selection.text.value.trim(),
  },
  {
    name: "Verify",
    icon: BookX,
    tooltip: "Select text, then click to find and avoid reasons for retraction",
    prefix: "$RETRACTION_AVOIDANCE_REQUEST$",
    enabled: !!selection.text.value.trim(),
  },
  {
    name: "Citations",
    icon: LibraryBig,
    tooltip: "Select text, then click to find and add relevant citations",
    prefix: "$CITATION_REQUEST$",
    enabled: !!selection.text.value.trim(),
  },
  {
    name: "Repo",
    icon: GitFork,
    tooltip:
      "Select a full GitHub repo URL, then click to draft based on its content",
    prefix: "$REPO_REQUEST$",
    enabled: !!selection.text.value
      .trim()
      .match(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  },
]);

const runAction = async (prefix: string) => {
  if (!session.value) {
    toast("No AI service session", "error");
    return;
  }

  const stopThinking = think();

  try {
    const result = await manugen(
      `${prefix}${selection.text.value}`,
      session.value,
    );
    return result;
  } catch (error) {
    console.warn(error);
    toast("AI service error", "error");
  } finally {
    stopThinking();
  }
};

/** save output as markdown */
const saveMd = () => downloadMd(output.value, nameFallback.value);

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
  downloadHtml(content, nameFallback.value);
};

/** print output as pdf */
const savePdf = async () => {
  const oldTitle = document.title;
  document.title = nameFallback.value;
  outputElement.value?.classList.add("print");
  await sleep();
  window.print();
  outputElement.value?.classList.remove("print");
  document.title = oldTitle;
};

/** intercept ctrl + p */
useEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "p") {
    event.preventDefault();
    savePdf();
  }
});

/** attached files */
const figures = ref<Upload[]>([]);

/** show figures */
const showFigures = ref(false);
</script>

<template>
  <header
    class="bg-secondary flex flex-wrap items-center justify-between gap-4 p-4"
  >
    <!-- header left -->
    <div>
      <AppUpload
        tooltip="Upload manuscript content files"
        :accept="textAccepts.concat(textExtensions)"
        :drop-zone="inputElement"
        @files="uploadInput"
      >
        <ArrowUp />
      </AppUpload>

      <AppButton
        v-tooltip="showFigures ? 'Hide figures panel' : 'Show figures planel'"
        :active="showFigures"
        @click="showFigures = !showFigures"
      >
        <FileImage />
        <div v-if="figures.length" class="absolute -top-2 -right-1 text-xs">
          {{ figures.length }}
        </div>
      </AppButton>

      <VDropdown>
        <AppButton v-tooltip="'Examples'">
          <Lightbulb />
        </AppButton>

        <template #popper>
          <div class="flex flex-col items-start gap-2">
            <AppButton
              v-for="(_, key) in examples"
              :key="key"
              @click="loadExample(key)"
            >
              <span>
                {{ key }}
              </span>
            </AppButton>
          </div>
        </template>
      </VDropdown>

      <input v-model="name" placeholder="New Manuscript" />

      <AppUploadBadge v-if="upload" :upload="upload" />
    </div>

    <!-- header middle -->
    <div class="text-primary gap-4! text-xl uppercase">
      <img :src="logo" class="h-8" />
      <span class="whitespace-nowrap">{{ VITE_TITLE }}</span>
      <div class="-ml-4 h-0 w-0">
        <AppBrain class="h-12 w-12 translate-x-4 -translate-y-1/2" />
      </div>
    </div>

    <!-- header right -->
    <div>
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
    <!-- figure panel -->
    <aside
      v-show="showFigures"
      ref="figureElement"
      class="flex w-60 shrink-0 resize-x flex-col items-center rounded-lg bg-slate-100 transition-[margin,translate]"
    >
      <div class="flex items-center gap-2 p-4">
        <AppUpload
          tooltip="Upload figures"
          :accept="imageAccepts.concat(imageExtensions)"
          :drop-zone="figureElement"
          @files="(files) => (figures = figures.concat(files))"
        >
          <ImageUp />
        </AppUpload>
        <template v-if="figures.length">
          <AppButton
            v-tooltip="'Auto-name figures 1, 2, 3...'"
            @click="
              figures.forEach(
                (figure, index) => (figure.name = `Figure ${index + 1}`),
              );
              toast('Auto-named figures', 'success');
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
        class="flex w-full flex-col items-center gap-4 overflow-y-auto p-4"
      >
        <template
          #item="{ element, index }: { element: Upload; index: number }"
        >
          <div class="flex w-full flex-col gap-2">
            <div class="max-h-60 max-w-full">
              <img
                v-tooltip="'Drag to reorder'"
                :src="element.uri"
                class="h-full w-full cursor-grab object-cover shadow"
              />
            </div>
            <div class="flex items-center gap-2">
              <input v-model="element.name" placeholder="Name" class="grow" />
              <AppUploadBadge :upload="element" />
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

    <!-- input panel -->
    <div class="flex w-[50%] shrink-0 resize-x flex-col items-center gap-2">
      <!-- ai actions -->
      <div class="flex flex-wrap items-center justify-center gap-2">
        <AppButton
          v-for="(action, index) in actions"
          :key="index"
          v-tooltip="action.tooltip"
          :class="
            !action.enabled ? 'cursor-not-allowed! opacity-50 grayscale' : ''
          "
          @click="
            action.enabled
              ? runAction(action.prefix)
              : toast('Follow button help text to use this action', 'info')
          "
        >
          <component :is="action.icon" />
          <span>{{ action.name }}</span>
        </AppButton>
      </div>

      <!-- text input -->
      <textarea
        ref="inputElement"
        v-model="input"
        placeholder="Start writing your manuscript Markdown here"
        class="h-full w-full resize-none p-4!"
      />
    </div>

    <!-- output panel -->
    <div
      ref="outputElement"
      class="flex flex-grow flex-col gap-4 rounded-lg bg-slate-100 p-4"
      v-html="output"
    />
  </main>
</template>

<style scoped>
@reference "tailwindcss";

header > * {
  @apply flex grow basis-0 flex-wrap items-center gap-2;
}

header > :first-child {
  @apply justify-start;
}

header > :nth-child(2) {
  @apply justify-center;
}

header > :last-child {
  @apply justify-end;
}

main > * {
  @apply overflow-y-auto;
}
</style>
