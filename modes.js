// Existing RiiFFS draft treatments, retained while the optical concept is explored.
export const modeDefinitions = [{ id: "lunar", label: "RiiFFS Lunar", description: "Lunar Pulse and Lunar Blush portraits.", color: "#9183c8", developerOnly: false }];

const identityLock = `IMAGE 1 is the only source photograph. Preserve exactly the same number of original human subjects and every person's recognizable identity, exact facial features, facial expression, eye direction, smile, hair, skin tone, and social chemistry. Do not omit, merge, replace, beautify, age, or de-age any original person. Keep every original face unobstructed and unmistakably recognizable.`;

const noText = `NO TEXT: Do not render letters, words, numbers, captions, headlines, logos, watermarks, signatures, labels, signage, interface copy, or decorative pseudo-text anywhere.`;

const noBorder = `EDGE-TO-EDGE ARTWORK: Extend the scene naturally and continuously to all four canvas edges. Do not add a border, frame, mat, inset panel, picture edge, poster outline, decorative perimeter, bounding rectangle, card, vignette, white margin, or colored band around the image.`;

export const riiffsStyleDefinitions = [
  {
    id: "lunar-pulse",
    label: "Lunar Pulse",
    description: "A cool cobalt and violet moonlit editorial portrait.",
    prompt: `Create a premium nocturnal fragrance campaign portrait with a full, luminous moon and a deep cobalt-to-violet atmosphere. Add fine star-like glints, soft luminous haze, and elegant blue-violet rim light around the original people. Let the scene feel tactile and cinematic, like a high-end beauty editorial photographed inside a lunar installation. Include at most one small unbranded sculptural glass perfume flacon as a secondary prop; never obscure a face or change the people’s pose. Keep the color balance blue-led with restrained magenta accents.`,
  },
  {
    id: "lunar-blush",
    label: "Lunar Blush",
    description: "Peach light, rose glass, and a soft violet lunar glow.",
    prompt: `Create a premium nocturnal fragrance campaign portrait with a full, luminous moon and a rich midnight-blue background. Add peach-pink and rose-violet light, subtle fine star glints, and glossy translucent glass accents. Let the scene feel tactile and cinematic, like a high-end beauty editorial photographed inside a lunar installation. Include at most one small unbranded sculptural glass perfume flacon as a secondary prop; never obscure a face or change the people’s pose. Keep pinks and peach luminous but balanced with blue and violet shadows.`,
  },
];

export function publicModes() { return modeDefinitions; }
export function publicRiiffsStyles() { return riiffsStyleDefinitions.map(({ id, label, description }) => ({ id, label, description })); }
export const publicLunarStyles = publicRiiffsStyles;
export function normalizeMode() { return "lunar"; }
export function styleTransferSpec({ styleId } = {}) {
  const style = riiffsStyleDefinitions.find(s => s.id === styleId) || riiffsStyleDefinitions[0];
  return { id: `riiffs-${style.id}-v1`, label: style.label,
    prompt: `${identityLock}\n\n${style.prompt}\n\n${noText}\n\n${noBorder}\n\nReturn one unified finished editorial portrait. Preserve each person's recognizable identity, pose, and position.` };
}
export function styleTransferPrompt(options) { return styleTransferSpec(options).prompt; }
