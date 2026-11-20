import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import sharp from "sharp";
import { createApp } from "../app.js";
import { config } from "../config.js";
import { styleTransferPrompt } from "../modes.js";
import { saveRemoteImage } from "../utils/imageUtils.js";

let temporaryDirectory;
let app;

before(async () => {
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "lunar-photobooth-"));
  app = createApp({
    config: {
      ...config, fallback: { ...config.fallback, enabled: false }, print: { ...config.print, prepareStrips: false, autoSubmit: false },
      falKey: "",
      directories: {
        uploads: path.join(temporaryDirectory, "uploads"),
        photos: path.join(temporaryDirectory, "photos"),
      },
      labels: {
        styled: "Styled Portrait",
        original: "Source Portrait",
      },
    },
  });
});

after(async () => {
  await fs.rm(temporaryDirectory, { recursive: true, force: true });
});

test("health endpoint reports service readiness", async () => {
  const response = await request(app).get("/").expect(200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.aiConfigured, false);
});

test("public config exposes labels and modes without secrets", async () => {
  const response = await request(app).get("/config").expect(200);
  assert.equal(response.body.labels.styled, "Styled Portrait");
  assert.deepEqual(response.body.modes.map((mode) => mode.id), ["lunar"]);
  assert.deepEqual(response.body.lunarStyles.map((style) => style.id), [
    "lunar-pulse",
    "lunar-blush",
  ]);
  assert.equal(response.body.falKey, undefined);
});

test("submit requires a photo", async () => {
  const response = await request(app).post("/submit").expect(400);
  assert.equal(response.body.success, false);
});

test("only the Lunar mode is available", async () => {
  const modes = await request(app).get("/modes").expect(200);
  assert.deepEqual(modes.body.modes.map((mode) => mode.id), ["lunar"]);
});

test("Lunar drafts preserve identity without unrelated brand treatments", () => {
  for (const styleId of ["lunar-pulse", "lunar-blush"]) {
    const prompt = styleTransferPrompt({ mode: "lunar", styleId });
    assert.match(prompt, /IMAGE 1 is the only source photograph/);
    assert.match(prompt, /Do not add a border/);
    assert.match(prompt, /NO TEXT/);
    assert.doesNotMatch(prompt, /emperor|hedgehog|PostHog/);
  }
});

test("saved portraits keep the generated image free of a source-photo inset", async () => {
  const styled = await sharp({
    create: { width: 400, height: 300, channels: 3, background: "#245ca8" },
  }).jpeg().toBuffer();
  const photoId = "clean-portrait";
  await saveRemoteImage({
    url: `data:image/jpeg;base64,${styled.toString("base64")}`,
    outputDirectory: temporaryDirectory,
    photoId,
  });

  const { data, info } = await sharp(path.join(temporaryDirectory, `${photoId}.jpg`))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixel = (x, y) => data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3);
  const topLeftPixel = pixel(24, 24);
  const styledPixel = pixel(300, 200);
  assert.ok(topLeftPixel[2] > topLeftPixel[0], "the generated portrait should remain clean at top left");
  assert.ok(styledPixel[2] > styledPixel[0], "the styled portrait should remain outside the notch");
});

test("submit supports a named Lunar style with one source image", async () => {
  const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  let receivedPrompt;
  const integrationApp = createApp({
    config: {
      ...config, fallback: { ...config.fallback, enabled: false }, print: { ...config.print, prepareStrips: false, autoSubmit: false },
      falKey: "",
      directories: {
        uploads: path.join(temporaryDirectory, "integration-uploads"),
        photos: path.join(temporaryDirectory, "integration-photos"),
      },
    },
    editor: {
      async styleTransfer(_source, _filename, prompt) {
        receivedPrompt = prompt;
        return { styledUrl: `data:image/png;base64,${onePixelPng.toString("base64")}` };
      },
    },
  });

  const response = await request(integrationApp)
    .post("/submit")
    .field("mode", "lunar")
    .field("style", "lunar-pulse")
    .attach("photo", onePixelPng, "portrait.png")
    .expect(200);

  assert.match(receivedPrompt, /IMAGE 1 is the only source photograph/);
  assert.match(receivedPrompt, /premium nocturnal fragrance campaign/);
  assert.match(receivedPrompt, /cobalt-to-violet/);
  assert.doesNotMatch(receivedPrompt, /IMAGE 2/);
  assert.equal(response.body.output.mode, "lunar");
  assert.match(receivedPrompt, /EDGE-TO-EDGE ARTWORK/);
  assert.equal(response.body.output.styleProfile, "riiffs-lunar-pulse-v1");
  assert.equal(response.body.output.styleLabel, "Lunar Pulse");
  assert.equal(response.body.output.styled, response.body.output.variantA);
  const activity = await request(integrationApp).get("/api/status").expect(200);
  assert.equal(activity.body.completed.total, 1);
  assert.equal(activity.body.completed.today, 1);
  assert.equal(activity.body.processing.length, 0);
});

test("submit uses a supplied prompt override verbatim", async () => {
  const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  let receivedPrompt;
  const integrationApp = createApp({
    config: {
      ...config, fallback: { ...config.fallback, enabled: false }, print: { ...config.print, prepareStrips: false, autoSubmit: false },
      falKey: "",
      directories: {
        uploads: path.join(temporaryDirectory, "override-uploads"),
        photos: path.join(temporaryDirectory, "override-photos"),
      },
    },
    editor: {
      async styleTransfer(_source, _filename, prompt) {
        receivedPrompt = prompt;
        return { styledUrl: `data:image/png;base64,${onePixelPng.toString("base64")}` };
      },
    },
  });

  await request(integrationApp)
    .post("/submit")
    .field("mode", "lunar")
    .field("style", "lunar-pulse")
    .field("promptOverride", "  Render this custom treatment.  ")
    .attach("photo", onePixelPng, "portrait.png")
    .expect(200);

  assert.equal(receivedPrompt, "Render this custom treatment.");
});

test("analytics endpoint accepts retry-safe plain-text batches and exposes counts on status", async () => {
  const body=JSON.stringify({events:[{id:'integration-analytics-001',name:'takeaway_view',site:'takeaway',environment:'test'}]});
  await request(app).post('/api/analytics').set('Content-Type','text/plain').send(body).expect(204);
  await request(app).post('/api/analytics').set('Content-Type','text/plain').send(body).expect(204);
  const status=await request(app).get('/api/status').expect(200);
  assert.equal(status.body.analytics.counts.test.takeaway_view,1);
  await request(app).post('/api/analytics').set('Content-Type','text/plain').send('invalid').expect(400);
  await request(app).post('/api/analytics').send({events:[{name:'pull'}]}).expect(400);
});
