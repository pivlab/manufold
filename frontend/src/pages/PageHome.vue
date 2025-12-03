<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from "vue";
import draggable from "vuedraggable";
import { useDebounce, useEventListener, useStorage } from "@vueuse/core";
import { isEqual, kebabCase } from "lodash";
import {
  Upload as ArrowUp,
  BookX,
  Code,
  Download,
  Feather,
  FileArchive,
  FileImage,
  FileStack,
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
import {
  aiScienceWriter,
  getSession,
  manubotCite,
  uploadArtifact,
} from "@/api/api";
import type { Session } from "@/api/api";
import type { Cite } from "@/api/manubot";
import logo from "@/assets/logo.svg";
import AppBrain, { think } from "@/components/AppBrain.vue";
import AppButton from "@/components/AppButton.vue";
import AppFrame from "@/components/AppFrame.vue";
import AppTabs from "@/components/AppTabs.vue";
import { toast } from "@/components/AppToasts";
import AppUpload from "@/components/AppUpload.vue";
import AppUploadBadge from "@/components/AppUploadBadge.vue";
import outputStyles from "@/output.css?inline";
import { downloadHtml, downloadMd, downloadZip } from "@/util/download";
import { render } from "@/util/markdown";
import { selectElementText, waitFor } from "@/util/misc";
import { splice } from "@/util/string";
import {
  imageAccepts,
  imageExtensions,
  parseFile,
  textAccepts,
  textExtensions,
  type Upload,
} from "@/util/upload";
import devTest from "./dev-test.md?raw";
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
// @ts-expect-error typing doesn't support dynamic refs
const inputElement = useTemplateRef("inputElement");
const outputElement = useTemplateRef("outputElement");

/** keep track of selected text in section */
const selection = ref("");

/** update section selected text */
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

/** document name */
const name = useStorage("name", "");

/** document name, with fallback */
const nameFallback = computed(() => name.value.trim() || "manuscript");

/** current sections input */
const sections = useStorage<{ name: string; content: string }[]>("sections", [
  { name: "Section", content: "" },
]);

/** current tab index */
const tab = useStorage("tab", 0);

/** add new section tab */
const addSection = () => sections.value.push({ name: "Section", content: "" });

/** delete section tab */
const deleteSection = (index: number) => {
  if (!window.confirm("Delete this section? No undo!")) return;
  sections.value.splice(index, 1);
};

/** reorder section tabs */
const reorderSections = (from: number, to: number) => {
  const moved = sections.value.splice(from, 1)[0];
  if (moved) sections.value.splice(to, 0, moved);
};

/** rename section tab */
const renameSections = (index: number, name: string) => {
  if (sections.value[index]) sections.value[index].name = name;
};

/** whether output all sections together */
const combineSections = useStorage("combine", true);

/** output markdown */
const output = useDebounce(
  computed(() =>
    (combineSections.value ? sections.value : [sections.value[tab.value]])
      .filter((section) => section !== undefined)
      .map((section) => section.content)
      .join("\n\n"),
  ),
  500,
  { maxWait: 1000 },
);

/** citation details */
const citations = ref<Cite[]>([]);

/** symbol to de-dupe requests */
let latestCitations: symbol;

/** match citation group */
const citationGroup = String.raw`\s*\[\s*@.*?\]\s*`;
/** match citation id */
const citationId = String.raw`@[^\s;]+:[^\s;\]]+`;

watch(
  output,
  async () => {
    /** mark this request as latest */
    const current = (latestCitations = Symbol());

    /** parse citation ids */
    const ids: string[] = [];
    for (const group of output.value.matchAll(new RegExp(citationGroup, "gm")))
      for (const id of group[0].matchAll(new RegExp(citationId, "gm")))
        ids.push(id[0].substring(1));

    const { update, close } = toast(
      `Getting ${ids.length.toLocaleString()} citations`,
      "loading",
      "citations",
    );
    try {
      /** request */
      const results = await manubotCite(ids);

      /** if this request not latest, ignore results */
      if (current !== latestCitations) return;

      /** avoid infinite updates */
      if (!isEqual(citations.value, results)) {
        /** set results */
        citations.value = results;
        update("Got citations", "success");
      } else close();
    } catch (error) {
      console.warn(error);
      update("Error getting citations", "error");
    }
  },
  { immediate: true },
);

/** output markdown converted to html */
const renderedOutput = computed(() => {
  let markdown = output.value;

  /** add bibliography */
  if (citations.value?.length) {
    /** lines */
    const bibliography = citations.value
      .map(({ id, title, author, publisher, issued }) => [
        `1. **${title || "???"}**`,
        (author ?? [])
          .map(({ given, family }) => [given, family].join(" "))
          .join(", "),
        [publisher, (issued?.["date-parts"]?.[0] ?? []).join("-"), id]
          .flat()
          .filter((part) => part?.trim())
          .join(" | "),
      ])
      .flat()
      .filter((part) => part?.trim())
      .map((line, index, array) =>
        [
          index > 0 ? "  " : "",
          line,
          index < array.length - 1 ? "  " : "",
        ].join(""),
      );

    /** add section to end */
    markdown += ["# Bibliography", "", ...bibliography].join("\n");
  }

  /** convert markdown to html document */
  const document = render(markdown);

  /** add heading ids */
  for (const heading of document.querySelectorAll("h1, h2, h3, h4, h5, h6"))
    heading.id = kebabCase(heading.textContent?.trim());

  /** stringify */
  let html = document.documentElement.outerHTML;

  /** add citation bibliography numbers */
  let groupMatch: RegExpMatchArray | null;
  while ((groupMatch = html.match(new RegExp(citationGroup, "dm")))) {
    /** get group props */
    const [groupStart, groupEnd] = groupMatch.indices?.[0] ?? [];
    if (!groupStart || !groupEnd) continue;
    let groupText = groupMatch[0];

    /** superscript numbers */
    const numbers: number[] = [];

    /** for each id in group */
    for (const idMatch of groupText.matchAll(new RegExp(citationId, "gm")))
      numbers.push(
        citations.value.findIndex(({ id }) => id === idMatch[0].substring(1)) +
          1,
      );

    /** replace group */
    groupText = `<sup>${numbers.join(",")}</sup>`;

    /** replace citation group */
    html = splice(html, groupStart, groupEnd, groupText);

    /** infinite loop protection */
    if (html === document.documentElement.outerHTML) break;
  }

  /** replace figure uris */
  for (const { name, extension, uri } of figures.value)
    html = html.replaceAll(name + extension, uri);

  return html;
});

/** upload section files */
const uploadSections = async (files: Upload[]) => {
  for (const file of files)
    sections.value.push({ name: file.name, content: file.data });
  await nextTick();
  tab.value = sections.value.length - 1;
  toast(`Uploaded ${files.length} file(s)`, "success");
};

const examples = {
  Blank: {
    name: "New Manuscript",
    sections: [{ data: "", name: "Section", type: "text/markdown" }],
    figures: [],
  },
  "Draft from skeleton w/ figs": {
    name: "Example Manuscript",
    sections: example1
      .split(/^# /gm)
      .map((section) => section.trim())
      .filter(Boolean)
      .map((section) => ({
        data: `# ${section}`,
        name: section.split("\n").shift()?.trim() ?? "file",
        type: "text/markdown",
      })),
    figures: [
      { data: example1Fig1, filename: "fig-1.png", type: "image/png" },
      { data: example1Fig2, filename: "fig-2.png", type: "image/png" },
      { data: example1Fig3, filename: "fig-3.png", type: "image/png" },
    ],
  },
  "Draft from GitHub repo": {
    name: "Example Manuscript",
    sections: [{ data: example2, name: "Example", type: "text/markdown" }],
    figures: [],
  },
  "Dev Test": {
    name: "Dev Test",
    sections: [{ data: devTest, name: "Example", type: "text/markdown" }],
    figures: [
      { data: example1Fig1, filename: "fig-1.png", type: "image/png" },
      { data: example1Fig2, filename: "fig-2.png", type: "image/png" },
      { data: example1Fig3, filename: "fig-3.png", type: "image/png" },
    ],
  },
};

/** load example */
const loadExample = async (key: keyof typeof examples) => {
  const example = examples[key];
  name.value = example.name;
  sections.value = example.sections.map(({ data, name }) => ({
    content: data,
    name,
  }));
  figures.value = await Promise.all(
    example.figures.map(({ data, filename, type }) =>
      parseFile(new File([data], filename, { type })),
    ),
  );
  toast("Loaded example", "success");
};

/** check h1 */
const checkHeading = (section: string) =>
  !section.match(/^# .+/gm) ? "Need top-level heading for action context" : "";

/** ai agent actions */
const actions = computed(() => [
  {
    name: "Draft",
    icon: Feather,
    tooltip: "Draft section based on high-level outline or description",
    prefix: "",
    check: checkHeading,
  },
  {
    name: "Refine",
    icon: Sparkles,
    tooltip: "Revise and improve",
    prefix: "$REFINE_REQUEST$",
    check: checkHeading,
  },
  {
    name: "Verify",
    icon: BookX,
    tooltip: "Find and avoid reasons for retraction",
    prefix: "$RETRACTION_AVOIDANCE_REQUEST$",
    check: checkHeading,
  },
  {
    name: "Citations",
    icon: LibraryBig,
    tooltip: "Find and add relevant citations",
    prefix: "$CITATION_REQUEST$",
    check: checkHeading,
  },
  {
    name: "Repo",
    icon: GitFork,
    tooltip: "Draft section based on GitHub repo contents",
    prefix: "$REPO_REQUEST$",
    check: (section: string) =>
      !section.match(/https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/)
        ? "No GitHub repo URL found"
        : "",
  },
]);

type Action = (typeof actions.value)[number];

/** is action currently running */
const running = ref(false);

/** run ai action with ai service */
const runAction = async ({ name, prefix, check }: Action) => {
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

  /** use selected text, or full text */
  const section =
    selection.value.trim() || sections.value[tab.value]?.content.trim();

  /** check if action is compatible with section */
  const error = check?.(section ?? "");
  if (error) {
    update(error, "error");
    stopThinking();
    running.value = false;
    return;
  }

  try {
    /** run ai action */
    const result = await aiScienceWriter(
      `${prefix}${section}`,
      session.value,
      (message) => toast(message, "info"),
    );

    if (!result) throw new Error("No result from AI service");

    /** un-disable section element */
    running.value = false;
    await nextTick();

    /** re-focus section */
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

/** when selected tab changes, scroll to section in output */
watch(
  tab,
  (tab) => {
    if (!outputElement.value) return;
    let name = sections.value[tab]?.name;
    if (!name) return;
    name = kebabCase(name);
    outputElement.value.element?.contentDocument
      ?.getElementById(name)
      ?.scrollIntoView({ behavior: "smooth" });
  },
  { immediate: true },
);

/** save output as markdown */
const saveMd = () => downloadMd(output.value, nameFallback.value);

/** save output as html */
const saveHtml = () => {
  if (!outputElement.value) return;
  if (!outputElement.value.src) return;
  downloadHtml(outputElement.value.src, nameFallback.value);
};

/** print output as pdf */
const savePdf = async () => {
  outputElement.value?.element?.contentWindow?.print();
};

/** save output as zip */
const saveZip = () => {
  downloadZip(
    sections.value
      .map((section) => ({
        filename: section.name + ".md",
        data: section.content,
      }))
      .concat(
        figures.value.map((figure) => ({
          filename: figure.name + figure.extension,
          data: figure.uri,
        })),
      ),
    nameFallback.value,
  );
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
const figures = useStorage<Figure[]>("figures", []);

/** show figures */
const showFigures = ref(false);

/** symbol to de-dupe requests */
let latestFigures: symbol;

watch(
  figures,
  async () => {
    /** mark this request as latest */
    const current = (latestFigures = Symbol());

    await waitFor(() => session.value);

    if (!session.value) {
      toast("No AI service session", "error");
      return;
    }

    const stopThinking = think();
    const { update, close } = toast("Updating figures", "loading", "figures");

    try {
      /** requests */
      const newFigures = await Promise.all(
        figures.value.map(async (figure) => {
          if (!session.value) throw Error("No session");

          /** send figure to ai service */
          const result = await uploadArtifact(
            session.value,
            figure.name,
            figure.data,
            figure.type,
            figure.hash,
          );

          /** combine result with existing figure info */
          return { ...figure, ...result };
        }),
      );

      /** if this request not latest, ignore results */
      if (current !== latestFigures) return;

      /** avoid infinite updates */
      if (!isEqual(figures.value, newFigures)) {
        /** set results */
        figures.value = newFigures;
        update("Updated figures", "success");
      } else close();
    } catch (error) {
      console.warn(error);
      update("Error updating figures", "error");
    }

    stopThinking();
  },
  { immediate: true, deep: true },
);
</script>

<template>
  <header
    class="bg-secondary flex flex-wrap items-center justify-between gap-4 p-2"
  >
    <!-- header left -->
    <div>
      <AppUpload
        tooltip="Upload manuscript content files"
        :accept="textAccepts.concat(textExtensions)"
        :drop-zone="inputElement"
        :disabled="running"
        @files="uploadSections"
      >
        <ArrowUp />
      </AppUpload>

      <AppButton
        v-tooltip="showFigures ? 'Hide figures panel' : 'Show figures panel'"
        :design="showFigures ? 'active' : undefined"
        @click="showFigures = !showFigures"
      >
        <FileImage />
        <div
          v-if="figures.length"
          class="text-primary absolute text-xs"
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
      <AppButton
        v-tooltip="
          combineSections
            ? 'Show only selected section'
            : 'Show all sections combined'
        "
        :design="combineSections ? 'active' : undefined"
        @click="combineSections = !combineSections"
      >
        <FileStack />
      </AppButton>

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
            <AppButton
              v-tooltip="'Save all sections and figures'"
              v-close-popper
              @click="saveZip"
            >
              <FileArchive />
            </AppButton>
          </div>
        </template>
      </VDropdown>
    </div>
  </header>

  <main class="flex h-0 grow">
    <!-- figure panel -->
    <aside
      v-show="showFigures"
      ref="figureElement"
      class="flex w-60 shrink-0 resize-x flex-col items-center border-r border-slate-300 transition-[margin,translate]"
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

      <draggable
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
                class="h-full w-full cursor-grab border border-slate-300 object-cover"
              />
            </div>
            <div class="flex items-center gap-2">
              <input
                :model-value="element.name"
                placeholder="Name"
                class="grow"
                @change="
                  element.name = (
                    $event.currentTarget as HTMLInputElement
                  ).value
                "
              />
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
      </draggable>
    </aside>

    <!-- section panel -->
    <div
      class="flex w-[50%] shrink-0 resize-x flex-col items-center gap-4 px-8 py-4"
    >
      <!-- tabs -->
      <AppTabs
        v-model="tab"
        :tabs="sections.map(({ name }) => ({ name }))"
        @add="addSection"
        @close="deleteSection"
        @reorder="reorderSections"
        @rename="renameSections"
      >
        <template v-for="(_, index) in sections" :key="index" #[index]>
          <!-- text section -->
          <textarea
            :ref="tab === index ? 'inputElement' : undefined"
            placeholder="Start writing your manuscript Markdown here"
            class="h-full w-full resize-none p-4!"
            :class="running ? 'user-select-none pointer-events-none' : ''"
            :disabled="running"
            :draggable="false"
            :value="sections[tab]?.content"
            @input="
              (event) =>
                (sections[tab]!.content = (
                  event.target as HTMLTextAreaElement
                ).value)
            "
            @select="updateSelection"
            @selectionchange="updateSelection"
          />
        </template>
      </AppTabs>

      <!-- ai actions -->
      <div class="flex flex-wrap items-center justify-center gap-2">
        <AppButton
          v-for="(action, index) in actions"
          :key="index"
          v-tooltip="action.tooltip"
          :disabled="running"
          @click="runAction(action)"
        >
          <component :is="action.icon" />
          <span>{{ action.name }}</span>
        </AppButton>
      </div>
    </div>

    <!-- output panel -->
    <AppFrame
      ref="outputElement"
      :title="nameFallback"
      :styles="outputStyles"
      :stylesheets="[
        'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css',
      ]"
      :body="renderedOutput"
      class="min-w-0 flex-grow border-l border-slate-300"
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
