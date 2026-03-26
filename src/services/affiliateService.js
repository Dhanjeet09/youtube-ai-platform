import { getAffiliateLinks } from "./monetizationService.js"

const CTA_TEMPLATES = [
  "Link in description for more details!",
  "Check the link below for the tools I mentioned!",
  "Get started with the link in the description!",
  "Everything you need is linked right down there!",
  "Don't forget to check out the link in the description!"
]

const PINNED_COMMENT = "🔗 LINKS MENTIONED IN THIS VIDEO 🔗"

export const generateAffiliateCTA = (niche) => {
  const cta = CTA_TEMPLATES[Math.floor(Math.random() * CTA_TEMPLATES.length)]
  const affiliateLinks = getAffiliateLinks(niche)

  if (affiliateLinks.length === 0) {
    return cta
  }

  const linksText = affiliateLinks
    .map(link => `${link.name}: ${link.url}`)
    .join("\n")

  return {
    voiceCTA: cta,
    descriptionCTA: `\n\n🔗 AFFILIATE LINKS (I earn commission at no cost to you):\n${linksText}\n\n💰 These links help support the channel!`,
    pinnedComment: `${PINNED_COMMENT}\n\n${linksText}\n\n⚠️ I may earn a small commission when you use these links, at no extra cost to you. This helps support the channel!`
  }
}

export const generateVideoDescription = (script, title, tags, niche) => {
  const affiliateData = generateAffiliateCTA(niche)

  const defaultDescription = `
${title}

${script}

━━━━━━━━━━━━━━━━━━━━

🔔 SUBSCRIBE for daily tips!

━━━━━━━━━━━━━━━━━━━━

📱 FOLLOW ME:
Instagram: @channel
Twitter: @channel

━━━━━━━━━━━━━━━━━━━━

#${tags.slice(0, 5).join(" #")}

${affiliateData.descriptionCTA}
`.trim()

  return {
    full: defaultDescription,
    short: defaultDescription.substring(0, 5000),
    affiliateCTA: affiliateData.descriptionCTA
  }
}

export const generatePinnedComment = (niche) => {
  const affiliateData = generateAffiliateCTA(niche)
  return affiliateData.pinnedComment
}
