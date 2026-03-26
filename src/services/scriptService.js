import groq from "../config/groq.js"

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

const log = (level, message, data = {}) => {
  console.log(`[${level}] [SCRIPT] ${message}`, Object.keys(data).length ? JSON.stringify(data) : "")
}

const retryWithBackoff = async (fn, maxRetries = 3) => {
  let lastError
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      log("WARN", `Attempt ${attempt} failed`, { error: error.message })
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt))
      }
    }
  }
  throw lastError
}

export const generateScript = async (topic, options = {}) => {
  const {
    contentType = "script",
    ageGroup = "18-25",
    maxWords = 200,
    temperature = 0.9,
    niche = "General",
    style: forcedStyle,
    hook: forcedHook
  } = options

  const ageInfo = AGE_GROUPS.find(a => a.name === ageGroup) || AGE_GROUPS[4]
  const ct = CONTENT_TYPES.find(c => c.name === contentType) || CONTENT_TYPES[0]
  const cta = CTA_PHRASES[Math.floor(Math.random() * CTA_PHRASES.length)]

  let prompt = ""

  if (contentType === "poem" || contentType === "rhyme") {
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
- MAX ${maxWords} words total
- Use power words that drive action

OUTPUT: Only the script text, no explanations.
`
  }

  try {
    const script = await retryWithBackoff(async () => {
      const completion = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL,
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
    log("INFO", "Script generated", { topic, contentType, ageGroup, wordCount })

    return script

  } catch (error) {
    log("ERROR", "Generation failed", { topic, error: error.message })
    throw new Error(`Script generation failed: ${error.message}`)
  }
}

export const getContentTypes = () => CONTENT_TYPES.map(c => ({ value: c.name, label: c.desc }))
export const getAgeGroups = () => AGE_GROUPS.map(a => ({ value: a.name, label: a.desc }))
export const getScriptStyles = () => ["storytelling", "list style", "educational", "comparison", "case study"]
