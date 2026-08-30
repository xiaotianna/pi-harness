import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import { resolveToolPath, type WorkspaceToolContext } from "../lib/tool-context.js";
import { isPdfBuffer, readRegularFile } from "../utils/media-file.js";

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2_048;
const MAX_IMAGE_PIXELS = 3_000_000;
const MAX_RENDER_ATTEMPTS = 4;

const ViewPdfPageParameters = Type.Object({
  path: Type.String({ description: "Workspace 内的 PDF 文件路径", minLength: 1 }),
  page: Type.Integer({ description: "要查看的页码，从 1 开始", minimum: 1 }),
});

export interface ViewPdfPageDetails {
  height: number;
  mimeType: string;
  page: number;
  pageCount: number;
  path: string;
  size: number;
  width: number;
}

interface RenderedPdfPage {
  buffer: Buffer;
  height: number;
  mimeType: "image/jpeg" | "image/png";
  pageCount: number;
  width: number;
}

function calculateRenderScale(width: number, height: number): number {
  return Math.min(
    2,
    MAX_IMAGE_DIMENSION / width,
    MAX_IMAGE_DIMENSION / height,
    Math.sqrt(MAX_IMAGE_PIXELS / (width * height)),
  );
}

async function renderPdfPage(
  buffer: Buffer,
  pageNumber: number,
  signal?: AbortSignal,
): Promise<RenderedPdfPage> {
  signal?.throwIfAborted();
  const [{ createCanvas }, { getDocument }] = await Promise.all([
    import("@napi-rs/canvas"),
    import("pdfjs-dist/legacy/build/pdf.mjs"),
  ]);
  signal?.throwIfAborted();
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    verbosity: 0,
  });
  let destroyPromise: Promise<void> | null = null;
  const cancelLoading = () => {
    destroyPromise ??= loadingTask.destroy();
  };
  signal?.addEventListener("abort", cancelLoading, { once: true });

  try {
    const document = await loadingTask.promise;
    signal?.throwIfAborted();
    if (pageNumber > document.numPages) {
      throw new Error(`页码超出范围，PDF 共 ${document.numPages} 页`);
    }
    const page = await document.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    let scale = calculateRenderScale(baseViewport.width, baseViewport.height);

    for (let attempt = 0; attempt < MAX_RENDER_ATTEMPTS; attempt += 1) {
      signal?.throwIfAborted();
      const viewport = page.getViewport({ scale });
      const width = Math.max(1, Math.floor(viewport.width));
      const height = Math.max(1, Math.floor(viewport.height));
      const canvas = createCanvas(width, height);
      const renderTask = page.render({
        background: "#ffffff",
        canvas: canvas as unknown as Parameters<typeof page.render>[0]["canvas"],
        viewport,
      });
      const cancelRender = () => renderTask.cancel();
      signal?.addEventListener("abort", cancelRender, { once: true });
      try {
        await renderTask.promise;
      } finally {
        signal?.removeEventListener("abort", cancelRender);
      }
      signal?.throwIfAborted();

      const png = await canvas.encode("png");
      if (png.byteLength <= MAX_IMAGE_BYTES) {
        return { buffer: png, height, mimeType: "image/png", pageCount: document.numPages, width };
      }
      const jpeg = await canvas.encode("jpeg", 82);
      if (jpeg.byteLength <= MAX_IMAGE_BYTES) {
        return {
          buffer: jpeg,
          height,
          mimeType: "image/jpeg",
          pageCount: document.numPages,
          width,
        };
      }
      scale *= Math.min(0.75, Math.sqrt(MAX_IMAGE_BYTES / jpeg.byteLength) * 0.9);
    }
    throw new Error("PDF 页面编码后仍超过 3 MB 限制");
  } finally {
    signal?.removeEventListener("abort", cancelLoading);
    await (destroyPromise ?? loadingTask.destroy());
  }
}

export function createViewPdfPageTool(
  context: WorkspaceToolContext,
): AgentTool<typeof ViewPdfPageParameters, ViewPdfPageDetails> {
  return {
    name: "view_pdf_page",
    label: "View PDF page",
    description:
      "将 workspace 内 PDF 的指定页面渲染为有界图片，用于查看页面布局、图表或扫描内容。页码从 1 开始。提取正文请使用 read_document。",
    parameters: ViewPdfPageParameters,
    executionMode: "parallel",
    async execute(_toolCallId, input, signal) {
      if (context.supportsImageInput?.() !== true) {
        throw new Error("当前模型不支持图片输入，无法使用 view_pdf_page");
      }
      if (!input.path.toLowerCase().endsWith(".pdf")) {
        throw new Error("view_pdf_page 仅支持 PDF 文件");
      }
      const path = await resolveToolPath(context, input.path);
      const buffer = await readRegularFile(path, MAX_PDF_BYTES, signal);
      if (!isPdfBuffer(buffer)) throw new Error("文件不是有效的 PDF");

      let rendered: RenderedPdfPage;
      try {
        rendered = await renderPdfPage(buffer, input.page, signal);
      } catch (error: unknown) {
        if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
        if (error instanceof Error && error.message.startsWith("页码超出范围")) throw error;
        throw new Error("无法渲染 PDF 页面", { cause: error });
      }
      return {
        content: [
          {
            data: rendered.buffer.toString("base64"),
            mimeType: rendered.mimeType,
            type: "image",
          },
        ],
        details: {
          height: rendered.height,
          mimeType: rendered.mimeType,
          page: input.page,
          pageCount: rendered.pageCount,
          path: input.path,
          size: rendered.buffer.byteLength,
          width: rendered.width,
        },
      };
    },
  };
}
