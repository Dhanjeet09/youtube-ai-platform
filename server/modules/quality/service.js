/**
 * Quality service provides video rendering quality presets.
 * These are used by the render pipeline to adjust output quality.
 */

export const QUALITY_PRESETS = {
  high: { crf: 18, preset: "slow", label: "High Quality" },
  medium: { crf: 23, preset: "medium", label: "Balanced" },
  low: { crf: 28, preset: "fast", label: "Fast Export" }
}

export const getQualityPreset = (quality = "medium") => {
  return QUALITY_PRESETS[quality] || QUALITY_PRESETS.medium
}

export const getAvailableQualities = () => {
  return Object.entries(QUALITY_PRESETS).map(([key, val]) => ({
    key,
    label: val.label
  }))
}
