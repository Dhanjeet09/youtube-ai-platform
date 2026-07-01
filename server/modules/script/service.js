import { getGroqClient } from "../../config/groq.js"
import { retryWithBackoff } from "../../utils/retry.js"
import { log as logger } from "../../utils/logger.js"

const CONTENT_TYPES = [
  { name: "script", desc: "YouTube Shorts Script" },
  { name: "poem", desc: "Creative Poem" },
  { name: "story", desc: "Engaging Story" },
  { name: "facts", desc: "Fun Facts" },
  { name: "rhyme", desc: "Rhyming Rhyme" },
  { name: "song", desc: "Catchy Song Lyrics" },
  { name: "joke", desc: "Funny Jokes" },
  { name: "riddle", desc: "Brain Teaser Riddles" }
]

const AGE_GROUPS = [
  { name: "3-5", desc: "Toddlers (3-5 years)", tone: "very simple, repetitive, musical" },
  { name: "5-8", desc: "Kids (5-8 years)", tone: "simple words, fun, educational" },
  { name: "8-12", desc: "Pre-teens (8-12 years)", tone: "engaging, relatable, slightly complex" },
  { name: "13-18", desc: "Teenagers (13-18 years)", tone: "trendy, relatable, energetic" },
  { name: "18-25", desc: "Young Adults (18-25 years)", tone: "modern, motivational, informative" },
  { name: "25-40", desc: "Adults (25-40 years)", tone: "professional, insightful, valuable" },
  { name: "40+", desc: "Mature Adults (40+ years)", tone: "wise, reflective, meaningful" }
]

const CTA_PHRASES = [
  "Like and subscribe for more!",
  "Follow for more amazing content!",
  "Share with your friends!",
  "Comment your thoughts below!",
  "Don't forget to subscribe!"
]

const log = (level, message, data = {}) => logger(level, `[SCRIPT] ${message}`, data)

const generateScriptWithVariables = (promptTemplate, vars) => {
  let result = promptTemplate
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g")
    result = result.replace(regex, value)
  }
  return result
}

const HINGLISH_PROMPT_TEMPLATE = (topic, videoType, maxWords) => `
Write a viral YouTube Shorts script in HINGLISH (mix of Hindi and English).

Topic: ${topic}
Language: Hinglish (60% Hindi, 40% English - natural desi football fan tone)
Duration: ${videoType} (${maxWords} words max)
Tone: Energetic, conversational, desi football fan

Structure (use these exact labels in the output):
[HOOK - 2 seconds] - Strong opening with number or bold claim in Hinglish
[BUILDUP - 8 seconds] - Context in Hinglish
[STAT - 10 seconds] - Explosive stat or number
[PREDICTION - 10 seconds] - Actionable take
[CTA - 5 seconds] - Subscribe follow-up

Rules:
- Strong first 2 seconds
- Curiosity loops throughout
- No clickbait
- High retention writing
- Avoid repetitive templates
- Make it feel like a friend talking, not a news anchor
- Use Hindi words naturally mixed with English
- End with "Subscribe karo for more football updates!"

OUTPUT: Only the script with section labels, no explanations.
`

export const generateScript = async (topic, options = {}) => {
  const {
    contentType = "script",
    ageGroup = "18-25",
    maxWords = 200,
    temperature = 0.9,
    niche = "General",
    style: forcedStyle,
    hook: forcedHook,
    language = "english",
    videoType = "short",
    scriptStructure,
    contentTemplate,
    matchData,
    vars = {}
  } = options

  const ageInfo = AGE_GROUPS.find(a => a.name === ageGroup) || AGE_GROUPS[4]
  const ct = CONTENT_TYPES.find(c => c.name === contentType) || CONTENT_TYPES[0]
  const cta = CTA_PHRASES[Math.floor(Math.random() * CTA_PHRASES.length)]

  const resolvedVars = {
    team1: matchData?.team1 || vars.team1 || "",
    team2: matchData?.team2 || vars.team2 || "",
    score1: matchData?.score1 ?? vars.score1 ?? "",
    score2: matchData?.score2 ?? vars.score2 ?? "",
    player: vars.player || matchData?.goals?.[0]?.player || "",
    ...vars
  }

  const actualMaxWords = videoType === "long" ? Math.min(maxWords, 1500) : Math.min(maxWords, 120)

  if (language === "hinglish") {
    if (contentTemplate?.promptTemplate) {
      let hinglishPrompt = HINGLISH_PROMPT_TEMPLATE(topic, videoType, actualMaxWords)
      hinglishPrompt = generateScriptWithVariables(hinglishPrompt, resolvedVars)
      return executeGroqPrompt(hinglishPrompt, temperature, actualMaxWords, topic)
    }
    const hinglishPrompt = HINGLISH_PROMPT_TEMPLATE(topic, videoType, actualMaxWords)
    const finalPrompt = generateScriptWithVariables(hinglishPrompt, resolvedVars)
    return executeGroqPrompt(finalPrompt, temperature, actualMaxWords, topic)
  }

  let prompt = ""

  if (contentTemplate?.promptTemplate) {
    const templatePrompt = generateScriptWithVariables(contentTemplate.promptTemplate, resolvedVars)
    prompt = templatePrompt + `\n\nTopic: ${topic}\n\nOUTPUT: Only the script text, no explanations.`
  } else if (contentType === "poem" || contentType === "rhyme") {
    prompt = `
Write a ${contentType === "rhyme" ? "fun rhyming poem" : "beautiful poem"} for young ${ageInfo.name} year olds.

Topic: ${topic}
Target Age: ${ageInfo.desc}
Tone: ${ageInfo.tone}

REQUIREMENTS:
- ${contentType === "rhyme" ? "MUST rhyme at the end of every line" : "Use beautiful imagery and metaphors"}
- Words must be easy for ${ageInfo.name} year olds to understand
- ${contentType === "rhyme" ? "Fun and bouncy rhythm" : "Emotional and expressive"}
- Keep lines short and memorable
- MAX ${maxWords} words
- Include a happy/positive ending

OUTPUT: Only the ${contentType}, no explanations.
`
  } else if (contentType === "story") {
    prompt = `
Write an engaging short story for ${ageInfo.name} year olds.

Topic: ${topic}
Target Age: ${ageInfo.desc}
Tone: ${ageInfo.tone}

REQUIREMENTS:
- Age-appropriate vocabulary for ${ageInfo.name} year olds
- ${ageInfo.name === "3-5" || ageInfo.name === "5-8" ? "Simple sentences, lots of repetition" : "Engaging narrative with a twist"}
- Clear beginning, middle, and end
- Positive message or moral
- MAX ${maxWords} words

OUTPUT: Only the story, no explanations.
`
  } else if (contentType === "facts") {
    prompt = `
Write ${ageInfo.name === "3-5" || ageInfo.name === "5-8" ? "5 simple fun facts" : "10 interesting facts"} about the topic.

Topic: ${topic}
Target Age: ${ageInfo.desc}

REQUIREMENTS:
- Facts must be easy to understand for ${ageInfo.name} year olds
- ${ageInfo.name === "3-5" || ageInfo.name === "5-8" ? "Use simple words, emojis encouraged" : "Use interesting details"}
- Start with the most surprising fact
- Make it engaging and memorable
- MAX ${maxWords} words

OUTPUT: Only the facts, numbered list, no explanations.
`
  } else if (contentType === "song") {
    prompt = `
Write catchy song lyrics for ${ageInfo.name} year olds.

Topic: ${topic}
Target Age: ${ageInfo.desc}
Tone: ${ageInfo.tone}

REQUIREMENTS:
- Lines should rhyme or have a rhythm
- Easy to sing for ${ageInfo.name} year olds
- Catchy chorus that repeats
- MAX ${maxWords} words
- Include [Verse], [Chorus], [Bridge] labels

OUTPUT: Only the lyrics, no explanations.
`
  } else if (contentType === "joke") {
    prompt = `
Write 5 funny jokes for ${ageInfo.name} year olds.

Topic: ${topic}
Target Age: ${ageInfo.desc}

REQUIREMENTS:
- Age-appropriate humor
- ${ageInfo.name === "3-5" || ageInfo.name === "5-8" ? "Simple, silly jokes" : "Clever wordplay and puns"}
- Each joke should be short
- End with a punchline
- MAX ${maxWords} words

OUTPUT: Only the jokes, numbered, no explanations.
`
  } else if (contentType === "riddle") {
    prompt = `
Write 5 brain teaser riddles for ${ageInfo.name} year olds.

Topic: ${topic}
Target Age: ${ageInfo.desc}

REQUIREMENTS:
- ${ageInfo.name === "3-5" || ageInfo.name === "5-8" ? "Simple riddles with concrete answers" : "Challenging riddles with clever clues"}
- Include the answer after each riddle
- Make them fun and engaging
- MAX ${maxWords} words

OUTPUT: Format:
1. Riddle
   Answer: ___
2. Riddle
   Answer: ___
(only the riddle and answer, no explanations)
`
  } else {
    const SCRIPT_HOOKS = [
      { name: "shocking fact", template: "Did you know that" },
      { name: "question", template: "What if I told you" },
      { name: "bold statement", template: "This is the truth about" },
      { name: "statistic", template: "Wait until you see this number:" },
      { name: "prediction", template: "In 2026, this will change everything" }
    ]
    const SCRIPT_STYLES = [
      { name: "storytelling", desc: "Tell a compelling story with a narrative arc" },
      { name: "list style", desc: "Numbered list format with quick facts" },
      { name: "educational", desc: "Teach something valuable" },
      { name: "comparison", desc: "Compare two things side by side" },
      { name: "case study", desc: "Real example with results" }
    ]

    const style = forcedStyle || SCRIPT_STYLES[Math.floor(Math.random() * SCRIPT_STYLES.length)]
    const hook = forcedHook || SCRIPT_HOOKS[Math.floor(Math.random() * SCRIPT_HOOKS.length)]

    if (videoType === "long") {
      prompt = `
Write a YouTube long-form video script (5-10 minutes) optimized for high retention.

Topic: ${topic}
Target Audience: ${ageInfo.desc}
Style: ${style.name} - ${style.desc}

STRUCTURE:
1. HOOK (0:00-0:30) - Strong opening
2. INTRO (0:30-1:00) - What the video covers
3. MAIN CONTENT (1:00-8:00) - Deep dive with examples and insights
4. SUMMARY (8:00-9:00) - Key takeaways
5. CTA (9:00-10:00) - Subscribe, like, comment

REQUIREMENTS:
- Engaging storytelling throughout
- Natural conversational tone
- Include timestamps for each section
- MAX ${actualMaxWords} words total
- End with value-driven CTA

OUTPUT: Only the script with section timestamps, no explanations.
`
    } else {
      prompt = `
Write a viral YouTube Shorts script optimized for AD REVENUE and AFFILIATE CONVERSIONS.

Topic: ${topic}
Target Audience: ${ageInfo.desc}
Style: ${style.name} - ${style.desc}
Hook: ${hook.name}

STRUCTURE:
1. HOOK - Grab attention with a bold claim or question
2. CONTENT - Deliver valuable points with examples
3. SOFT SELL - Mention tools/resources naturally
4. CTA - "${cta}"

REQUIREMENTS:
- Energetic, conversational tone
- Short punchy sentences (avg 8-12 words)
- Include emotional triggers: "secret", "truth", "mistake", "stop", "start"
- Mention 1-2 tools or resources naturally
- End with urgency or exclusivity
- MAX ${actualMaxWords} words total
- Use power words that drive action

OUTPUT: Only the script text, no explanations.
`
    }
  }

  return executeGroqPrompt(prompt, temperature, actualMaxWords, topic)
}

const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"

const executeGroqPrompt = async (prompt, temperature, maxWords, topic) => {
  try {
    const script = await retryWithBackoff(async () => {
      const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL
      const completion = await getGroqClient().chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: maxWords * 2
      })

      const content = completion?.choices?.[0]?.message?.content
      if (!content?.trim()) {
        throw new Error("Empty response from AI")
      }
      return content.trim()
    })

    const wordCount = script.split(/\s+/).length
    log("INFO", "Script generated", { topic, wordCount })

    return script

  } catch (error) {
    log("ERROR", "Generation failed", { topic, error: error.message })
    throw new Error(`Script generation failed: ${error.message}`)
  }
}

export const getContentTypes = () => CONTENT_TYPES.map(c => ({ value: c.name, label: c.desc }))
export const getAgeGroups = () => AGE_GROUPS.map(a => ({ value: a.name, label: a.desc }))
export const getScriptStyles = () => ["storytelling", "list style", "educational", "comparison", "case study", "hook-buildup-stat-prediction-cta"]
