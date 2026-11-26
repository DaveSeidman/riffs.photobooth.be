import fs from "node:fs/promises";
import sharp from "sharp";
import path from "node:path";

export function normalizePortraitContext({ peopleCount = 1, affinities = [], treatment } = {}) {
  if (!Number.isInteger(peopleCount) || peopleCount < 1 || peopleCount > 4)
    throw Object.assign(new Error("Choose between one and four guests."), { status: 400 });
  if (!Array.isArray(affinities) || (affinities.length && affinities.length !== peopleCount) ||
      affinities.some(a => !["pulse", "blush"].includes(a)))
    throw Object.assign(new Error("Invalid guest colour selections."), { status: 400 });
  if (treatment !== undefined && !["pulse", "blush"].includes(treatment))
    throw Object.assign(new Error("Choose Blush or Pulse."), { status: 400 });
  return { peopleCount, affinities, treatment };
}

export function dramaticPoseSpec(context) {
  const { peopleCount, affinities, treatment } = normalizePortraitContext(context);
  const palette = affinities.length ? affinities.map((a, i) =>
    `Guest ${i + 1} from left to right chose ${a === "pulse" ? "cobalt/violet" : "raspberry pink"} as a creative colour preference.`).join(" ") :
    "Balance raspberry-pink and deep cobalt/violet light across the composition.";
  const staging = peopleCount === 1
    ? "One close portrait retaining the source head angle and facial proportions, with a subtle shoulder turn. The guest holds one reference bottle upright beside the cheek or collarbone, with relaxed, anatomically plausible fingers. The other bottle stands small in the lower foreground. Keep the face dominant and unobstructed."
    : peopleCount === 2
      ? "A cinematic two-person campaign with the diagonal energy of a tango: the person originally on the left leads a gentle supported lean, the person originally on the right turns their shoulder back towards camera. Both faces remain large and recognizable. Their poses feel poised and theatrical. Do not assume they are a couple or introduce kissing. One guest holds a reference bottle near their own shoulder; the complementary bottle is visible in the lower foreground. Left/right determines staging, never gender."
      : `An editorial ensemble of all ${peopleCount} guests at staggered heights, each with a different shoulder turn and clear face. One guest holds a reference bottle near their own cheek or collarbone; another holds its complementary bottle. Keep the bottle silhouettes readable and hands separated. No extra people.`;
  const spec = {
    id: "riiffs-dramatic-pose-v2",
    label: "The Lunar campaign",
    aspectRatio: peopleCount >= 3 ? "3:2" : "2:3",
    prompt: `Photographically restyle IMAGE 1 as a RiiFFS Lunar fragrance campaign portrait. Keep its actual people and original faces; edit the photograph instead of casting or generating new people. Format: ${peopleCount >= 3 ? "landscape 3:2" : "vertical 2:3"}, composed for a 4 by 6 inch postcard.

IDENTITY LOCK: This is a photographic restyling of the actual people in IMAGE 1, not a recasting or a face redesign. Each guest must look unmistakably like the same individual in their source photo. Preserve their underlying facial anatomy and proportions: face shape, forehead, hairline, eye shape and spacing, eyelids, eyebrows, nose bridge and tip, natural lip shape, cheekbones, jawline, chin, ears, facial asymmetry and distinguishing marks. Preserve apparent age, natural complexion, skin texture, hair, facial hair and glasses. Do not beautify, idealize, slim, widen, symmetrize, age or de-age faces; do not substitute a generic fragrance-model face or blend features between guests. Change the photography, lighting, colour grading and expression, never the person's identity or permanent facial features. Coloured light may illuminate skin without changing the person's underlying skin tone.

NO CELEBRITY OR MODEL SUBSTITUTION: Never replace a guest with a celebrity, actor, public figure, professional model or lookalike. Do not import familiar faces from fragrance advertising, cinema or your training examples, even if they share a guest's complexion, hairstyle, age or facial hair. The source faces are locked photographic material: retain their individual landmarks, proportions and fine details instead of synthesizing more glamorous alternatives. Borrow only photographic treatment from the campaign genre. If a new expression or pose would require inventing a different face, keep the source expression and head pose and change only the lighting, setting and colour grade.

EXPRESSION VERSUS ANATOMY: Expressions may move facial muscles naturally, but must not remodel the face. Slightly parted lips must retain that guest's own lip shape; an intrigued gaze must retain their actual eyes, brows and eye spacing. Keep head angles close to the source and use only subtle head turns. If a dramatic pose, expression or campaign treatment would weaken likeness, simplify it and preserve the original face instead. Recognizability takes priority over glamour, pose and styling. Before returning the image, compare every face against IMAGE 1 and correct any identity drift.

CAST SELECTION: Include a guest when at least half of their face is visible in IMAGE 1, including a recognizable side profile or a small background face. Include ALL of them exactly once. Omit incidental shoulders, limbs, backs of heads and people whose faces are more than half hidden by the crop or an obstruction. Never complete a cropped body by inventing a face. For each included guest, keep their left-to-right order and use only their own source face. Preserve their expression and head angle when changing either would require guessing facial details. Never borrow features from a clearer face elsewhere in the group.

REFERENCE ROLES: IMAGE 1 is the ONLY source of human identities. The booth estimates ${peopleCount} guests, but that estimate may be wrong: the face visibility rule in CAST SELECTION overrides the estimate and all staging suggestions. Preserve each person's distinctive facial structure, apparent age, skin tone, body proportions, hair, facial hair, glasses and personal identity. Preserve cultural or religious garments. Ignore any transparent preview bottle, screen effects or booth background in IMAGE 1. IMAGE 2 is ONLY the product reference: the pink bottle is Lunar Blush; the pink/violet/cobalt bottle is Lunar Pulse. Never copy identities from another image or replace the guests with professional models.

EXPRESSION DIRECTION, SUBJECT TO THE IDENTITY LOCK: Direct each guest as if the shutter catches a private thought. Lips relaxed and very slightly parted where natural, soft jaw, alert eyes, a restrained sidelong or direct gaze; quietly intrigued, self-possessed, emotionally ambiguous. Neither a broad happy grin nor a sad or angry face. Adjust expression gently, and adapt the body pose only while retaining the source head angle and facial anatomy. Create tension through a slight lift of the chin, a turned shoulder and a moment of stillness, rather than exaggerated pouting or an open-mouthed gasp. Keep teeth subtle, skin texture natural and recognizable features intact.

STAGING: Apply the following suggestion ONLY if its cast size matches the actual source. ${staging} If three or more guests meet the face visibility rule, always create a wide editorial ensemble with all included guests at staggered heights or in two rows, even if a solo or pair suggestion was supplied. Never turn a group into a solo portrait. Wardrobe is elegant, fully clothed contemporary evening tailoring with satin or fluid fabric; it need not be gendered. Keep every guest their original apparent age; younger guests get age-appropriate clothing, expressions and non-romantic staging. Do not infer gender, sexuality, relationships or scent preference from appearance. ${palette} Colour preferences affect lighting only and do not prescribe which guest holds which fragrance.

PRODUCT ACCURACY: Include BOTH Lunar bottles, each once, with the same geometry as IMAGE 2: a tall clear glass rounded rectangular exterior with deep curved bevels, an upper cap and lower body divided at the waist; inside is a glittering hourglass-shaped coloured cavity. Blush is rich raspberry pink; Pulse shifts pink through violet to cobalt blue. Keep clear glass visible around the hourglass, brilliant edge reflections, convincing thickness, tiny suspended metallic sparkles. Preserve the supplied product lettering where legible. Bottles remain realistically hand-sized. No generic cylindrical atomizers or invented bottle designs. Hands grip naturally without fused fingers or passing through glass.

PHOTOGRAPHY: Deep black-plum studio atmosphere; a soft lunar key on faces, precise cobalt rim light and a restrained raspberry edge, glossy glass highlights, a trace of haze and tiny distant points of light. Premium editorial photography, close enough to read the eyes, sophisticated warm skin against cool shadows, shallow photographic depth of field with faces and held bottle in focus. Sculptural and emotionally charged. Avoid galaxy prints on skin, cartoon effects, excessive glitter, neon outlines and airbrushed plastic faces. Leave the lowest 15 percent as quiet dark negative space for typography added separately. No headline, slogan, border, watermark or other brand. One coherent camera frame: no repeated faces, tiling, puzzle pieces or collage.`,
  };
  // Keep legacy campaign requests compatible; the booth now explicitly chooses a treatment.
  if (!treatment) return spec;
  const blush = treatment === "blush";
  const name = blush ? "Blush" : "Pulse";
  const bottleSide = blush ? "left" : "right";
  spec.id = `riiffs-lunar-${treatment}-campaign-v9`;
  spec.label = `Lunar ${name}`;
  const treatmentStaging = `STAGING: Set exactly ONE Lunar ${name} bottle upright on the ${bottleSide} end of the foreground table, as seen by the viewer. Its center belongs in the outer ${bottleSide} quarter of the final image. Keep the middle of the table free of bottles. Leave a small gap at the side edge so the entire reference bottle is visible, realistically hand-sized, with a grounded contact shadow. Keep every original guest behind the table, with faces clearly visible and head angles close to the source. Use subtle shoulder turns and poised, natural expressions. Nobody holds a bottle. Do not let the product or table hide a face. For groups, widen the framing or arrange rows to preserve everyone. Elegant, fully clothed contemporary tailoring; preserve cultural and religious garments. Younger guests retain age-appropriate clothing, expressions and non-romantic staging. Never infer gender, relationships or scent preference from appearance.`;
  const product = `PRODUCT ACCURACY: IMAGE 2 supplies the product geometry only. Include only the ${blush ? "raspberry-pink Lunar Blush" : "pink/violet/cobalt Lunar Pulse"} bottle, exactly once. Do not include the other fragrance. Match IMAGE 2 exactly. The outer bottle is a tall, clear glass rectangular prism with a SQUARE footprint when viewed from above: width and depth are equal. Its four vertical corners have deep, smoothly rounded bevels. The transparent shell is colorless and optically clear, with visible thickness, crisp edge reflections and natural refraction. Do not tint it opaque, frost it, haze it, or replace it with a solid colored shell.

Inside the shell, the colored perfume reservoir is a perfectly rotationally symmetric surface of revolution around the bottle's vertical centerline. Its cross section is circular at every height, never square or faceted. The reservoir has broad, full upper and lower lobes, a narrow central waist, and smoothly domed, rounded ends at the top and bottom. The top and bottom lobes are fuller than the waist. Blush is rich raspberry pink. Pulse transitions through pink, violet and cobalt blue. The liquid remains inside the clear shell with visible clear glass around it.

The bottle has two equal-height clear glass sections joined at a fine horizontal seam halfway up. The upper section is the cap and matches the lower section's square footprint and outer silhouette. Keep the cap and body aligned as one continuous rectangular glass outline. Preserve the reference lettering and its placement where legible, plus fine suspended metallic sparkles within the liquid. Keep the bottle upright, hand-sized and proportionate. Do not invent a spray nozzle, cylindrical atomizer, extra cap, extra glass divisions, square inner reservoir, or alternate bottle silhouette.`;
  const photography = blush
    ? `PHOTOGRAPHY: A luminous pink-and-white fragrance editorial. A clean WHITE satin-gloss table fills the lower foreground, with a soft, low-contrast reflection of the Blush bottle that fades gently across its surface, a delicate contact shadow and a faint rose light spill. The table must read as white, never pink, grey, black or a hard mirror. Behind the guests, broad airy clouds of powder pink and soft rose, inspired by flowing pink ink, dissolve into luminous white. Palette: pale rose #d59cbe, restrained magenta #b34b97 accents, pearl white highlights. Whites and pale pink dominate; no blue/cobalt cast, dark plum background or peach-orange grade. Large diffused key light, natural skin tone and texture, gentle rose rim light, translucent glass highlights. Faces and bottle are crisp, background softly out of focus. Sophisticated, spacious and photographic; no plastic skin, excessive glitter, neon outlines, cartoon effects, headline, border or watermark. One coherent camera frame, no repeated faces or collage.`
    : `PHOTOGRAPHY: Deep black-plum studio atmosphere with cobalt and violet light. A dark polished table fills the lower foreground and carries a restrained reflection of the Pulse bottle. Soft lunar key on faces, precise cobalt rim light and restrained raspberry edges, glossy glass highlights, a trace of haze and tiny distant points of light. Premium editorial photography with natural warm skin against cool shadows; faces and bottle remain readable, background softly out of focus. Sculptural and emotionally charged. No galaxy prints on skin, excessive glitter, neon outlines, airbrushed plastic faces, headline, border or watermark. One coherent camera frame, no repeated faces or collage.`;
  spec.prompt = spec.prompt
    .replace(/STAGING:[\s\S]*?(?=\n\nPRODUCT ACCURACY:)/, treatmentStaging)
    .replace(/PRODUCT ACCURACY:[\s\S]*?(?=\n\nPHOTOGRAPHY:)/, product)
    .replace(/PHOTOGRAPHY:[\s\S]*$/, photography);
  spec.prompt += `\n\nFINAL COMPOSITION CHECK: The Lunar ${name} bottle is at the viewer's ${bottleSide} edge of the composition, with the center of the table clear. Preserve the square outer footprint, crystal-clear rounded glass shell, radial symmetry and rounded hourglass reservoir from IMAGE 2. Keep the cap and body proportions, product color and lettering exact.`;
  return spec;
}

export async function loadBottleReference() {
  return fs.readFile(new URL("../style-references/lunar/bottles.jpg", import.meta.url));
}

export async function createPostcardAsset(buffer, directory, photoId, context) {
  const { peopleCount, treatment } = normalizePortraitContext(context);
  const blush = treatment === "blush";
  const background = blush ? "#fff7fb" : "#090511";
  const ink = blush ? "#763858" : "#f6efff";
  const caption = treatment ? `YOUR LUNAR ${treatment.toUpperCase()} MOMENT.` : peopleCount === 2 ? "IT TAKES TWO TO TANGO." : "WHERE PULSE MEETS BLUSH.";
  const width = peopleCount >= 3 ? 1800 : 1200;
  const height = peopleCount >= 3 ? 1200 : 1800;
  const typography = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="shade" x2="0" y2="1"><stop stop-color="${background}" stop-opacity="0"/><stop offset="1" stop-color="${background}" stop-opacity=".95"/></linearGradient></defs>
    <rect x="0" y="${height-220}" width="${width}" height="220" fill="url(#shade)"/>
    <path d="M${width/2-120} ${height-205}H${width/2+120}" stroke="#d9c2ec" stroke-opacity=".55"/>
    <g text-anchor="middle" fill="${ink}" font-family="Arial, sans-serif">
      <text x="${width/2}" y="${height-160}" font-size="23" letter-spacing="5">${caption}</text>
      <text x="${width/2}" y="${height-85}" font-size="48" letter-spacing="3">RiiFFS</text>
      <text x="${width/2}" y="${height-40}" font-size="17" letter-spacing="5">${treatment ? `LUNAR ${treatment.toUpperCase()}` : "LUNAR PULSE × LUNAR BLUSH"}</text>
    </g></svg>`);
  // Preserve the entire generated frame, including guests at the edges. The
  // caption gets its own footer instead of being painted over people's faces.
  await sharp(buffer).rotate().resize(width, height-220, { fit: "contain", background })
    .extend({bottom:220, background})
    .composite([{ input: typography }]).withMetadata({ density: 300 })
    .jpeg({ quality: 96, chromaSubsampling: "4:4:4" })
    .toFile(path.join(directory, `${photoId}-postcard.jpg`));
  return { postcard: `/photos/${photoId}-postcard.jpg`, printSize: "4x6", printDpi: 300 };
}
