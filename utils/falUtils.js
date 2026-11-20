import { logEvent } from "./logger.js";
import path from "node:path";
import { fal } from "@fal-ai/client";

const mimeTypes = {
  ".avif": "image/avif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const extractFirstImageUrl = (result) => {
  const images = result?.data?.images;
  if (!Array.isArray(images) || images.length === 0) return null;
  return typeof images[0] === "string" ? images[0] : images[0]?.url ?? null;
};

export function createFalEditor({
  credentials,
  model,
  resolution = "1K",
  thinkingLevel = "minimal",
  timeoutMs = 30_000,
}) {
  if (credentials) fal.config({ credentials });

  const upload = async (buffer, filename) => {
    if (!credentials) throw new Error("FAL_KEY is not configured.");
    const type = mimeTypes[path.extname(filename).toLowerCase()] || "application/octet-stream";
    // fal's image endpoints accept data URIs. Keeping references inline avoids
    // the separate storage-init upload and its connection/URL-expiry failures.
    return `data:${type};base64,${buffer.toString("base64")}`;
  };

  const edit = async (imageUrl, prompt, context = {}) => {
    const started = performance.now();
    logEvent("model.edit-started", { model, photoId: context.photoId, role: context.role });
    const input = {
      prompt,
      image_urls: Array.isArray(imageUrl) ? imageUrl : [imageUrl],
      num_images: 1,
      output_format: "jpeg",
      limit_generations: true,
    };
    if (context.aspectRatio) input.aspect_ratio = context.aspectRatio;
    if (model === "fal-ai/nano-banana-2/edit") {
      input.resolution = resolution;
      input.thinking_level = thinkingLevel;
      input.enable_web_search = false;
    }
    const result = await fal.subscribe(model, {
      input,
      logs: false,
      timeout: timeoutMs,
      abortSignal: context.signal,
      onQueueUpdate: (update) => logEvent("model.queue", { model, photoId: context.photoId, role: context.role, status: update.status, queuePosition: update.queue_position }),
    });
    const outputUrl = extractFirstImageUrl(result);
    if (!outputUrl) throw new Error("The image model returned no output URL.");
    logEvent("model.edit-returned", { model, photoId: context.photoId, role: context.role, durationMs: Math.round(performance.now() - started) });
    return outputUrl;
  };

  return {
    upload,
    async styleTransfer(sourceBuffer, sourceFilename, prompt, context = {}) {
      const sourceUrl = await upload(sourceBuffer, sourceFilename);
      const styledUrl = await edit([sourceUrl], prompt, context);
      return { sourceUrl, styledUrl };
    },
    edit,
  };
}
