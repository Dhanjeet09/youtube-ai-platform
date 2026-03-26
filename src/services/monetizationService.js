const HIGH_RPM_NICHES = {
  Finance: {
    name: "Finance",
    rpm: 12,
    keywords: ["investing", "stocks", "crypto", "personal finance", "money tips", "wealth building"],
    affiliatePartners: [
      { name: "Robinhood", url: "https://join.robinhood.com/", commission: "5%" },
      { name: "WeBull", url: "https://webull.com/", commission: "3%" },
      { name: "Coinbase", url: "https://coinbase.com/", commission: "50%" }
    ]
  },
  Business: {
    name: "Business",
    rpm: 15,
    keywords: ["business tips", "startup", "entrepreneurship", "side hustle", "online business"],
    affiliatePartners: [
      { name: "Shopify", url: "https://shopify.com/", commission: "100%" },
      { name: "Canva", url: "https://canva.com/", commission: "30%" },
      { name: "ClickFunnels", url: "https://clickfunnels.com/", commission: "40%" }
    ]
  },
  Technology: {
    name: "Technology",
    rpm: 10,
    keywords: ["AI tools", "software", "gadgets", "tech reviews", "productivity apps"],
    affiliatePartners: [
      { name: "Notion", url: "https://notion.so/", commission: "50%" },
      { name: "Todoist", url: "https://todoist.com/", commission: "30%" },
      { name: "NordVPN", url: "https://nordvpn.com/", commission: "30%" }
    ]
  },
  Health: {
    name: "Health",
    rpm: 8,
    keywords: ["fitness", "weight loss", "health tips", "workout", "nutrition"],
    affiliatePartners: [
      { name: "MyFitnessPal", url: "https://myfitnesspal.com/", commission: "20%" },
      { name: "Headspace", url: "https://headspace.com/", commission: "30%" }
    ]
  },
  RealEstate: {
    name: "Real Estate",
    rpm: 18,
    keywords: ["real estate investing", "property", "rental income", "flipping houses"],
    affiliatePartners: [
      { name: "Fundrise", url: "https://fundrise.com/", commission: "100%" },
      { name: "Rich Dad Education", url: "https://richdad.com/", commission: "30%" }
    ]
  },
  Education: {
    name: "Education",
    rpm: 9,
    keywords: ["online courses", "learning", "skills", "career", "certification"],
    affiliatePartners: [
      { name: "Udemy", url: "https://udemy.com/", commission: "15%" },
      { name: "Skillshare", url: "https://skillshare.com/", commission: "30%" },
      { name: "Coursera", url: "https://coursera.org/", commission: "20%" }
    ]
  }
}

export const getHighRpmNiches = () => {
  return Object.entries(HIGH_RPM_NICHES)
    .sort((a, b) => b[1].rpm - a[1].rpm)
    .map(([key, value]) => ({
      key,
      ...value
    }))
}

export const getNicheByKey = (key) => {
  return HIGH_RPM_NICHES[key] || null
}

export const getBestNicheForMonetization = () => {
  return getHighRpmNiches()[0]
}

export const getAffiliateLinks = (nicheKey) => {
  const niche = HIGH_RPM_NICHES[nicheKey]
  if (!niche) return []
  return niche.affiliatePartners
}

export const getEstimatedEarnings = (views, nicheKey) => {
  const niche = HIGH_RPM_NICHES[nicheKey]
  if (!niche) return { estimated: 0, rpm: 5 }
  
  const rpm = niche.rpm
  const estimated = (views / 1000) * rpm
  
  return {
    estimated: Math.round(estimated * 100) / 100,
    rpm,
    niche: niche.name,
    breakdown: {
      ads: estimated * 0.4,
      affiliate: estimated * 0.6
    }
  }
}

export const getAllNicheKeys = () => Object.keys(HIGH_RPM_NICHES)
