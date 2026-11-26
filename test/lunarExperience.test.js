import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import request from "supertest";
import {
  dramaticPoseSpec,
  createPostcardAsset,
} from "../utils/lunarExperience.js";
import { createApp } from "../app.js";
import { config } from "../config.js";

const context = { peopleCount: 2, affinities: ["pulse", "blush"] };
const photo = await sharp({
  create: { width: 80, height: 80, channels: 3, background: "#ab7c9f" },
})
  .jpeg()
  .toBuffer();
test("campaign direction preserves identities, supports solo and groups, and never assigns scent by appearance", () => {
  const pair = dramaticPoseSpec(context);
  assert.equal(pair.aspectRatio, "2:3");
  assert.match(pair.prompt, /Include ALL of them exactly once/);
  assert.match(pair.prompt, /actual people visible in IMAGE 1 ALWAYS override the numeric estimate/);
  assert.match(pair.prompt, /four-person source MUST produce a four-person group/);
  assert.match(pair.prompt, /very slightly parted/);
  assert.match(pair.prompt, /Include BOTH Lunar bottles/);
  assert.match(pair.prompt, /Left\/right determines staging, never gender/);
  assert.match(dramaticPoseSpec({ peopleCount: 1 }).prompt, /One close portrait retaining the source head angle/);
  assert.match(dramaticPoseSpec({ peopleCount: 4 }).prompt, /all 4 guests/);
  assert.throws(() => dramaticPoseSpec({ peopleCount: 5 }));
  assert.throws(() => dramaticPoseSpec({ peopleCount: 2, affinities: ["pulse"] }));
});
test("postcard has physical 4 by 6 proportions and 300 dpi metadata", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "lunar-postcard-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const output = await createPostcardAsset(photo, dir, "test", context);
  const metadata = await sharp(path.join(dir, "test-postcard.jpg")).metadata();
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 1800);
  assert.equal(metadata.density, 300);
  assert.equal(output.printSize, "4x6");
});
test("group postcards use landscape and retain the complete top and bottom edges", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "lunar-group-card-"));
  t.after(() => fs.rm(dir, {recursive:true, force:true}));
  const source = await sharp({create:{width:100,height:100,channels:3,background:"#000"}})
    .composite([{input:Buffer.from('<svg width="100" height="100"><path d="M0 0H100V10H0ZM0 90H100V100H0Z" fill="white"/></svg>')}]).png().toBuffer();
  await createPostcardAsset(source,dir,"group",{peopleCount:4});
  const {data,info} = await sharp(path.join(dir,"group-postcard.jpg")).raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,1800);
  assert.equal(info.height,1200);
  for (const y of [5,975]) assert.ok(data[(y*info.width+900)*info.channels]>220,"source edges remain visible");
  assert.equal(dramaticPoseSpec({peopleCount:4}).aspectRatio,"3:2");
});
async function appFor(t, editor) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "lunar-campaign-api-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return createApp({
    config: {
      ...config,
      falKey: "",
      falInputWidth: 512,
      allowedOrigins: [],
      fallback: { enabled: true, normalDurationMs: 20 },
      print: { prepareStrips: true, autoSubmit: false },
      directories: {
        uploads: path.join(dir, "uploads"),
        photos: path.join(dir, "photos"),
      },
    },
    editor,
  });
}
test("campaign preserves source detail, sends identity and bottle references, and returns a postcard without strip generation", async (t) => {
  let calls = 0, uploads = 0, prompt, sourceWidth;
  const app = await appFor(t, {
    async upload(buffer) {
      uploads++;
      if (uploads === 1) sourceWidth = (await sharp(buffer).metadata()).width;
      return `https://test.invalid/ref-${uploads}.jpg`;
    },
    async edit(images, p, context) {
      calls++; prompt = p;
      assert.equal(images.length, 2);
      assert.notEqual(images[0], images[1]);
      assert.equal(context.aspectRatio, '2:3');
      return `data:image/jpeg;base64,${photo.toString('base64')}`;
    },
  });
  const highResolutionSource = await sharp({create:{width:1600,height:1200,channels:3,background:"#ab7c9f"}}).jpeg().toBuffer();
  const response = await request(app)
    .post("/submit")
    .field("style", "dramatic-pose")
    .field("portraitContext", JSON.stringify(context))
    .attach("photo", highResolutionSource, "pair.jpg")
    .expect(200);
  assert.equal(calls, 1);
  assert.equal(uploads, 2);
  assert.equal(sourceWidth, 1024);
  assert.match(prompt, /IMAGE 2/);
  assert.match(prompt, /IDENTITY LOCK:/);
  assert.equal(response.body.output.generationMode, "ai");
  assert.equal(response.body.output.printStatus, "disabled");
  assert.match(response.body.output.postcard, /-postcard.jpg$/);
  assert.equal(response.body.output.tile, undefined);
  await request(app).get(response.body.output.postcard).expect(200);
});
test("invalid context is rejected before billing and failed campaign generation never masquerades as a successful local filter", async (t) => {
  let calls = 0;
  const app = await appFor(t, {
    async styleTransfer() {
      calls++;
      throw new Error("Mock provider offline");
    },
  });
  await request(app)
    .post("/submit")
    .field("style", "dramatic-pose")
    .field("portraitContext", JSON.stringify({ peopleCount: 5 }))
    .attach("photo", photo, "pair.jpg")
    .expect(400);
  assert.equal(calls, 0);
  await request(app)
    .post("/submit")
    .field("style", "dramatic-pose")
    .field("portraitContext", JSON.stringify(context))
    .attach("photo", photo, "pair.jpg")
    .expect(500);
  assert.equal(calls, 1);
});

test("both treatments reach generation with the correct bottle and postcard palette", async (t) => {
  for (const treatment of ["blush", "pulse"]) {
    const spec = dramaticPoseSpec({peopleCount: 3, treatment});
    assert.equal(spec.aspectRatio, "3:2");
    assert.match(spec.prompt, /IDENTITY LOCK:/);
    assert.match(spec.prompt, /Include ALL of them exactly once/);
    assert.match(spec.prompt, /Nobody holds a bottle/);
    assert.doesNotMatch(spec.prompt, /Include BOTH|The guest holds|complementary bottle/);
    let prompt;
    const app = await appFor(t, {
      async upload() { return "https://test.invalid/reference.jpg"; },
      async edit(images, direction) {
        assert.equal(images.length, 2);
        prompt = direction;
        return `data:image/jpeg;base64,${photo.toString('base64')}`;
      },
    });
    const response = await request(app).post("/submit")
      .field("style", "dramatic-pose")
      .field("portraitContext", JSON.stringify({peopleCount: 1, treatment}))
      .attach("photo", photo, "guest.jpg").expect(200);
    assert.equal(response.body.output.styleLabel, treatment === "blush" ? "Lunar Blush" : "Lunar Pulse");
    assert.match(prompt, treatment === "blush" ? /WHITE satin-gloss table/ : /dark polished table/);
    const postcard = await request(app).get(response.body.output.postcard).expect(200);
    const {data} = await sharp(postcard.body).extract({left: 10, top: 1790, width: 1, height: 1}).raw().toBuffer({resolveWithObject: true});
    assert.ok(treatment === "blush" ? data[0] > 240 : data[0] < 20);
  }
});

test("invalid treatment is rejected before image generation", async (t) => {
  const app = await appFor(t, {async styleTransfer() { assert.fail("must not call AI"); }});
  await request(app).post("/submit").field("style", "dramatic-pose")
    .field("portraitContext", JSON.stringify({treatment: "unknown"}))
    .attach("photo", photo, "guest.jpg").expect(400);
});
