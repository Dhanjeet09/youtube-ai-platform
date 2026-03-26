import yts from "youtube-search-api"

const HIGH_RPM_NICHES = {
  Finance: {
    keywords: ["investing", "stock market", "crypto", "personal finance", "money tips", "wealth building", "passive income"],
    queries: ["stock market tips", "crypto investing", "personal finance India", "money making app", "mutual fund"]
  },
  Business: {
    keywords: ["business tips", "startup", "entrepreneurship", "side hustle", "online business", "make money online"],
    queries: ["how to start business", "side hustle ideas", "online income", "entrepreneur tips", "passive income ideas"]
  },
  Technology: {
    keywords: ["AI tools", "software", "gadgets", "tech reviews", "productivity apps", "chatgpt alternatives"],
    queries: ["best AI tools", "tech gadgets 2026", "productivity apps", "software reviews", "AI tools for work"]
  },
  Health: {
    keywords: ["fitness", "weight loss", "health tips", "workout", "nutrition", "healthy lifestyle"],
    queries: ["weight loss tips", "workout routine", "healthy diet", "fitness tips", "weight loss exercise"]
  },
  RealEstate: {
    keywords: ["real estate investing", "property", "rental income", "flipping houses", "land investment"],
    queries: ["real estate investing", "property investment", "rental property", "house flipping India", "land investment"]
  },
  Education: {
    keywords: ["online courses", "learning", "skills", "career", "certification", "free courses"],
    queries: ["free online courses", "skill development", "career tips", "certification courses", "learning apps"]
  }
}

const FALLBACK_TRENDS = {
  Finance: ["Money Tips That Will Change Your Life", "Investment Basics for Beginners", "How to Build Wealth"],
  Business: ["Make Money Online Legitimately", "Side Hustle Ideas That Work", "Entrepreneurship Tips"],
  Technology: ["Best AI Tools for 2026", "ChatGPT Alternatives", "Tech Tips That Work"],
  Health: ["Weight Loss Secrets", "Daily Workout Routine", "Healthy Habits That Work"],
  RealEstate: ["Property Investment Guide", "How to Start Real Estate", "Rental Income Tips"],
  Education: ["Free Courses That Pay Off", "Skills for Future", "Learning Tips"]
}

const log = (level, message, data = {}) => {
  console.log(`[${level}] [TRENDS] ${message}`, Object.keys(data).length ? JSON.stringify(data) : "")
}

const isValidVideo = (video) => {
  return video && 
    video.title && 
    video.title.length > 5 &&
    !video.title.toLowerCase().includes("live") &&
    !video.title.toLowerCase().includes("premiere")
}

export const getTrends = async (options = {}) => {
  const { niche, limit = 10 } = options

  const nicheData = niche && HIGH_RPM_NICHES[niche]
  const queries = nicheData 
    ? nicheData.queries 
    : ["trending India", "viral videos India"]

  const allTrends = []
  const seen = new Set()

  for (const query of queries.slice(0, 3)) {
    try {
      const res = await yts.GetListByKeyword(query, false, limit)
      
      const validItems = (res.items || [])
        .filter(isValidVideo)
        .filter(v => !seen.has(v.title))
        .slice(0, 5)

      validItems.forEach(v => {
        seen.add(v.title)
        allTrends.push({
          title: v.title,
          videoId: v.videoId,
          thumbnail: v.thumbnail?.thumbnails?.[0]?.url
        })
      })
    } catch (error) {
      log("WARN", "Query failed", { query, error: error.message })
    }
  }

  if (allTrends.length === 0) {
    log("WARN", "No trends found, using fallback")
    const fallbackKey = niche && FALLBACK_TRENDS[niche] ? niche : "Finance"
    return FALLBACK_TRENDS[fallbackKey].map((title, i) => ({
      title,
      videoId: `fallback_${i}`,
      thumbnail: null
    }))
  }

  log("INFO", "Trends fetched", { count: allTrends.length, niche })
  return allTrends
}

export const getTrendsByNiche = async (niche) => {
  if (!HIGH_RPM_NICHES[niche]) {
    throw new Error(`Invalid niche. Available: ${Object.keys(HIGH_RPM_NICHES).join(", ")}`)
  }
  return getTrends({ niche })
}

export const getAvailableNiches = () => Object.keys(HIGH_RPM_NICHES)

export const getNicheKeywords = (niche) => {
  return HIGH_RPM_NICHES[niche]?.keywords || []
}
