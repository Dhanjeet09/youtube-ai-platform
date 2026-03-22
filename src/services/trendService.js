import yts from "youtube-search-api"

export const getTrends = async () => {
  try {
    const res = await yts.GetListByKeyword("trending india", false, 10)

    const trends = res.items
      .map(v => v.title)
      .filter(Boolean)

    if (!trends.length) throw new Error("No trends")

    return trends

  } catch (error) {
    console.error("YouTube trends failed:", error.message)

    return [
      "AI tools",
      "Make money online",
      "Tech hacks"
    ]
  }
}