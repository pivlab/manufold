<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from "vue";
import draggableComponent from "vuedraggable";
import { useEventListener, useStorage } from "@vueuse/core";
import { isEqual } from "lodash";
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
import { aiScienceWriter, getSession, uploadArtifact } from "@/api/api";
import type { Session } from "@/api/api";
import logo from "@/assets/logo.svg";
import AppBrain, { think } from "@/components/AppBrain.vue";
import AppButton from "@/components/AppButton.vue";
import { toast } from "@/components/AppToasts";
import AppUpload from "@/components/AppUpload.vue";
import AppUploadBadge from "@/components/AppUploadBadge.vue";
import styles from "@/styles.css?inline";
import { downloadHtml, downloadMd } from "@/util/download";
import { hash, selectElementText, sleep } from "@/util/misc";
import {
  imageAccepts,
  imageExtensions,
  parseFile,
  textAccepts,
  textExtensions,
  type Upload,
} from "@/util/upload";
import example1Fig1 from "./example-1-figure-1.png?arraybuffer";
import example1Fig2 from "./example-1-figure-2.png?arraybuffer";
import example1Fig3 from "./example-1-figure-3.png?arraybuffer";
import example1 from "./example-1.md?raw";
import example2 from "./example-2.md?raw";

const { VITE_TITLE } = import.meta.env;

/** ai service session */
const session = ref<Session>();

/** establish session with backend */
onMounted(async () => {
  const { update } = toast("Connecting to AI service", "loading");
  try {
    session.value = await getSession();
    update("Connected to AI service", "success");
  } catch (error) {
    console.warn(error);
    update("Failed to connect to AI service", "error");
  }
});

/** elements */
const figureElement = useTemplateRef("figureElement");
const inputElement = useTemplateRef("inputElement");
const outputElement = useTemplateRef("outputElement");

/** keep track of selected text in input */
const selection = ref("");

/** update input selected text */
const updateSelection = () => {
  if (!inputElement.value) return;
  const { selectionStart, selectionEnd } = inputElement.value;
  selection.value = inputElement.value.value.substring(
    selectionStart,
    selectionEnd,
  );
};

/** for dev */
// window.localStorage.clear();

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
    name: "Example Manuscript",
    input: { data: example1, filename: "example.md", type: "text/markdown" },
    figures: [
      { data: example1Fig1, filename: "fig-1.png", type: "image/png" },
      { data: example1Fig2, filename: "fig-2.png", type: "image/png" },
      { data: example1Fig3, filename: "fig-3.png", type: "image/png" },
    ],
  },
  "Draft from GitHub repo": {
    name: "Example Manuscript",
    input: { data: example2, filename: "example.md", type: "text/markdown" },
    figures: [],
  },
};

/** load example */
const loadExample = async (key: keyof typeof examples) => {
  const example = examples[key];
  name.value = example.name;
  input.value = example.input.data;
  upload.value = await parseFile(
    new File([example.input.data], example.input.filename, {
      type: example.input.type,
    }),
  );
  figures.value = await Promise.all(
    example.figures.map(({ data, filename, type }) =>
      parseFile(new File([data], filename, { type })),
    ),
  );
  toast("Loaded example", "success");
};

/** ai agent actions */
const actions = computed(() => [
  {
    name: "Draft",
    icon: Feather,
    tooltip:
      "Select one # Heading 1 section and its content, then click to draft",
    prefix: "",
    enabled:
      /** starts with h1 */
      selection.value.trim().startsWith("# ") &&
      /** only has 1 h1 */
      [...selection.value.matchAll(/^# /gm)].length === 1 &&
      /** has non-h1 line */
      [...selection.value.matchAll(/^\s*[^#\s]/gm)].length,
  },
  {
    name: "Refine",
    icon: Sparkles,
    tooltip: "Select text, then click to revise and improve",
    prefix: "$REFINE_REQUEST$",
    enabled: !!selection.value.trim(),
  },
  {
    name: "Verify",
    icon: BookX,
    tooltip: "Select text, then click to find and avoid reasons for retraction",
    prefix: "$RETRACTION_AVOIDANCE_REQUEST$",
    enabled: !!selection.value.trim(),
  },
  {
    name: "Citations",
    icon: LibraryBig,
    tooltip: "Select text, then click to find and add relevant citations",
    prefix: "$CITATION_REQUEST$",
    enabled: !!selection.value.trim(),
  },
  {
    name: "Repo",
    icon: GitFork,
    tooltip:
      "Select a full GitHub repo URL, then click to draft based on its content",
    prefix: "$REPO_REQUEST$",
    enabled: !!selection.value
      .trim()
      .match(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  },
]);

/** is action currently running */
const running = ref(false);

/** run ai action with ai service */
const runAction = async (prefix: string, name: string) => {
  /** check if connected to ai service */
  if (!session.value) {
    toast("No AI service session", "error");
    return;
  }

  /** prevent multiple actions from running simultaneously */
  if (running.value) {
    toast("Action currently running", "info");
    return;
  }

  const stopThinking = think();
  const { update } = toast(`Running "${name}"`, "loading");
  running.value = true;

  try {
    /** run ai action */
    const result = await aiScienceWriter(
      `${prefix}${selection.value}`,
      session.value,
      (message) => toast(message, "info"),
    );

    if (!result) throw new Error("No result from AI service");

    /** un-disable input element */
    running.value = false;
    await sleep();

    /** re-focus input */
    inputElement.value?.focus();

    /** paste result into selection, w/ browser undo history */
    document.execCommand("insertText", false, result);

    update(`Completed "${name}"`, "success");
  } catch (error) {
    console.warn(error);
    update("AI service error", "error");
  }

  stopThinking();
  running.value = false;
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

type Figure = Upload & Partial<Awaited<ReturnType<typeof uploadArtifact>>>;

/** attached figures */
const figures = ref<Figure[]>([]);

/** show figures */
const showFigures = ref(false);

const figureCache = new Map<number, Figure>();

watch(
  figures,
  async () => {
    if (!session.value) {
      toast("No AI service session", "error");
      return;
    }

    const stopThinking = think();
    const { update, close } = toast("Updating figures", "loading", "figures");

    try {
      const newFigures = await Promise.all(
        figures.value.map(async (figure) => {
          if (!session.value) throw Error("No session");

          /** id for figure from unique name/contents */
          const id = hash([figure.name, figure.data].join("|"));

          /** skip if already uploaded */
          const cached = figureCache.get(id);
          if (cached) return cached;

          /** send figure to ai service */
          const result = await uploadArtifact(
            session.value,
            figure.name,
            figure.data,
            figure.type,
          );

          /** combine result with existing figure info */
          const newFigure = { ...figure, ...result };

          /** update cache */
          figureCache.set(id, newFigure);

          return newFigure;
        }),
      );

      /** avoid infinite updates */
      if (!isEqual(figures.value, newFigures)) {
        figures.value = newFigures;
        update("Updated figures", "success");
      } else close();
    } catch (error) {
      console.warn(error);
      update("Error updating figures", "error");
    }

    stopThinking();
  },
  { deep: true },
);
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
        :disabled="running"
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
        <div
          v-if="figures.length"
          class="absolute text-xs"
          :class="showFigures ? '-top-2 -right-2' : '-top-1 -right-1'"
        >
          {{ figures.length }}
        </div>
      </AppButton>

      <VDropdown>
        <AppButton v-tooltip="'Examples'" :disabled="running">
          <Lightbulb />
        </AppButton>

        <template #popper>
          <div class="flex flex-col items-start gap-2">
            <AppButton
              v-for="(_, key) in examples"
              :key="key"
              v-close-popper
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
            <AppButton v-tooltip="'Markdown'" v-close-popper @click="saveMd">
              <Type />
            </AppButton>
            <AppButton v-tooltip="'HTML'" v-close-popper @click="saveHtml">
              <Code />
            </AppButton>
            <AppButton
              v-tooltip="'Print to PDF'"
              v-close-popper
              @click="savePdf"
            >
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
          #item="{ element, index }: { element: Figure; index: number }"
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
            <div
              v-if="element.title || element.description"
              class="truncate-lines"
              tabindex="0"
              @click="selectElementText($event.currentTarget as HTMLElement)"
            >
              <b v-if="element.title">
                {{ element.title }}
              </b>
              <div v-if="element.description" class="text-sm text-slate-500">
                {{ element.description }}
              </div>
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
          :disabled="running"
          :class="
            !action.enabled ? 'cursor-not-allowed! opacity-50 grayscale' : ''
          "
          @click="
            action.enabled
              ? runAction(action.prefix, action.name)
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
        :class="running ? 'user-select-none pointer-events-none' : ''"
        :disabled="running"
        :draggable="false"
        @select="updateSelection"
        @selectionchange="updateSelection"
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
