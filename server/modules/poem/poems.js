/**
 * Hindi Poem Database — 35+ poems/shayari for daily YouTube Shorts
 * Each poem has: title, lines, tags, and background theme.
 *
 * Poems are indexed by category for fast filtered access, and a
 * pre-built Map by id provides O(1) lookup by poem id.
 */

const HINDI_POEMS = [
  // ─── Motivation / Life ──────────────────────────────────────────
  {
    id: "p001",
    title: "हौसला",
    lines: "हौसला रखो गिरकर भी उठने का,\nहर अंधेरे में सवेरा छुपा होता है।\nजो गिरकर भी नहीं रुकता,\nउसकी किस्मत में जीत लिखी होती है।",
    tags: ["motivation", "life", "hope"],
    category: "motivation",
    background: "sunrise mountains",
  },
  {
    id: "p002",
    title: "सपने",
    lines: "सपने वो नहीं जो सोते वक़्त आएं,\nसपने वो हैं जो सोने न दें।\nमेहनत इतनी करो कि किस्मत भी कहे,\nबस तेरा हुकुम चले।",
    tags: ["dreams", "hardwork", "success"],
    category: "motivation",
    background: "night sky stars",
  },
  {
    id: "p003",
    title: "ज़िंदगी",
    lines: "ज़िंदगी एक सफ़र है सुहाना,\nयहाँ कल क्या हो किसने जाना।\nजो बीत गया सो बात गई,\nजो आने वाला है उसका इंतज़ार कर।",
    tags: ["life", "philosophy", "patience"],
    category: "motivation",
    background: "road journey",
  },
  {
    id: "p004",
    title: "हिम्मत",
    lines: "हिम्मत ना हार तू ऐ इंसान,\nमुश्किलें तो आती जाती हैं।\nतू चलते रह बस अपनी राह पर,\nमंज़िल तेरे क़दमों में आएगी।",
    tags: ["courage", "perseverance", "life"],
    category: "motivation",
    background: "path in forest",
  },
  {
    id: "p005",
    title: "वक़्त",
    lines: "वक़्त बदलता है बदलते देर नहीं लगती,\nपत्थर भी पिघल जाते हैं पानी बनने में।\nतू मेहनत कर बस रुकना मत,\nकामयाबी तेरे दरवाज़े पर आएगी।",
    tags: ["time", "change", "patience"],
    category: "motivation",
    background: "clock time",
  },

  // ─── Nature / Beauty ────────────────────────────────────────────
  {
    id: "p006",
    title: "बारिश",
    lines: "बारिश की बूँदें जब ज़मीन पर गिरती हैं,\nधरती की ख़ुशबू और बढ़ जाती है।\nहर बूँद में एक कहानी होती है,\nजो सुनो तो दिल को सुकून मिलता है।",
    tags: ["nature", "rain", "peace"],
    category: "nature",
    background: "rain drops",
  },
  {
    id: "p007",
    title: "फूल",
    lines: "फूल खिलते हैं बाग़ों में सजने के लिए,\nसितारे चमकते हैं रात जगाने के लिए।\nइंसान मुस्कुराता है दूसरों को जीतने के लिए,\nप्यार बाँटते हैं दुनिया बदलने के लिए।",
    tags: ["nature", "flowers", "love"],
    category: "nature",
    background: "flower garden",
  },
  {
    id: "p008",
    title: "नदी",
    lines: "नदी की तरह बहते रहो,\nपत्थरों से टकराकर भी रुको मत।\nजो बहता रहता है वो मंज़िल पाता है,\nजो ठहर जाता है वो सूख जाता है।",
    tags: ["nature", "river", "perseverance"],
    category: "nature",
    background: "flowing river",
  },
  {
    id: "p009",
    title: "चाँद",
    lines: "चाँद रात में चमकता है अंधेरे के बाद,\nतारे भी जलते हैं अंधेरे में ही।\nतू भी चमकेगा एक दिन ऐ दोस्त,\nबस रात गुज़रने दे धीरे-धीरे।",
    tags: ["nature", "moon", "hope"],
    category: "nature",
    background: "moonlit night",
  },
  {
    id: "p010",
    title: "सूरज",
    lines: "सूरज कहता है रोशनी बाँटो,\nहवा कहती है ठंडक दो।\nपेड़ कहता है छाँव दो,\nइंसान कहता है प्यार दो।",
    tags: ["nature", "sun", "giving"],
    category: "nature",
    background: "sunset",
  },

  // ─── Friendship / Love ──────────────────────────────────────────
  {
    id: "p011",
    title: "दोस्ती",
    lines: "दोस्ती वो नहीं जो मिलकर भूल जाएं,\nदोस्ती वो है जो दूर रहकर भी याद आए।\nएक दोस्त काफ़ी है ज़िंदगी जीने के लिए,\nबस एक सच्चा दोस्त चाहिए।",
    tags: ["friendship", "bond", "loyalty"],
    category: "friendship",
    background: "friends walking",
  },
  {
    id: "p012",
    title: "प्यार",
    lines: "प्यार वो एहसास है जो दिल में बसता है,\nहर साँस में बहता है बिन बोले।\nजो दिल से लगाए रखे उसे,\nउसकी कद्र करना सीखो।",
    tags: ["love", "feelings", "care"],
    category: "love",
    background: "couple sunset",
  },
  {
    id: "p013",
    title: "माँ",
    lines: "माँ का प्यार कोई दूसरा नहीं,\nमाँ की दुआओं में वरदान है।\nजिसकी माँ है उसके पास सब कुछ है,\nजिसकी माँ नहीं वो बेज़ार है।",
    tags: ["mother", "love", "family"],
    category: "love",
    background: "mother child",
  },
  {
    id: "p014",
    title: "पिता",
    lines: "पिता चुपचाप सब कुछ सह जाता है,\nपिता अपने दर्द छुपा लेता है।\nउसकी मेहनत का कोई मोल नहीं,\nपिता सबसे बड़ा भगवान है।",
    tags: ["father", "sacrifice", "family"],
    category: "love",
    background: "father son",
  },
  {
    id: "p015",
    title: "यादें",
    lines: "यादें वो ख़ज़ाना है जो दिल में छुपा है,\nहर पल की याद एक कहानी है।\nख़ुशी हो या ग़म सब याद रखना,\nयही तो ज़िंदगी की निशानी है।",
    tags: ["memories", "nostalgia", "life"],
    category: "friendship",
    background: "photo album",
  },

  // ─── Success / Dreams ───────────────────────────────────────────
  {
    id: "p016",
    title: "कामयाबी",
    lines: "कामयाबी उन्हीं को मिलती है,\nजो गिरकर भी उठते हैं।\nहार मानना तो कमज़ोरी है,\nलड़ना तो ज़िंदगी की कहानी है।",
    tags: ["success", "hardwork", "never give up"],
    category: "motivation",
    background: "trophy winner",
  },
  {
    id: "p017",
    title: "मंज़िल",
    lines: "मंज़िल उन्हीं को मिलती है,\nजो हिम्मत से चलते हैं।\nरास्ते बदलते रहो मंज़िल नहीं,\nक्योंकि मंज़िल तो तुम्हारे दिल में है।",
    tags: ["destination", "courage", "journey"],
    category: "motivation",
    background: "mountain top",
  },
  {
    id: "p018",
    title: "मेहनत",
    lines: "मेहनत का फल हमेशा मीठा होता है,\nजो पसीना बहाता है वो कभी नहीं रुकता।\nदुनिया उसी को याद रखती है,\nजो अपनी मेहनत से कुछ करता है।",
    tags: ["hardwork", "dedication", "results"],
    category: "motivation",
    background: "worker hands",
  },
  {
    id: "p019",
    title: "विश्वास",
    lines: "विश्वास रखो ख़ुद पर तो कुछ भी हो सकता है,\nपहाड़ भी हिल सकते हैं हौसले से।\nजो ख़ुद पर भरोसा रखता है,\nवो दुनिया बदल सकता है।",
    tags: ["belief", "self confidence", "power"],
    category: "wisdom",
    background: "person standing tall",
  },
  {
    id: "p020",
    title: "जीत",
    lines: "जीत उन्हीं की होती है जो लड़ते हैं,\nहार मानने वाले कभी कुछ नहीं पाते।\nतू लड़ अपनी लड़ाई बेख़ौफ़ होकर,\nकामयाबी तेरे क़दम चूमेगी।",
    tags: ["victory", "fight", "fearless"],
    category: "motivation",
    background: "flag waving",
  },

  // ─── Wisdom / Philosophy ────────────────────────────────────────
  {
    id: "p021",
    title: "सच्चाई",
    lines: "सच्चाई की राह में काँटे बहुत हैं,\nपर सच्चा इंसान कभी नहीं रुकता।\nसच बोलना आसान नहीं पर ज़रूरी है,\nझूठ से दूरी रखना ही असली जीत है।",
    tags: ["truth", "honesty", "wisdom"],
    category: "wisdom",
    background: "light path",
  },
  {
    id: "p022",
    title: "क्षमा",
    lines: "क्षमा करना बड़प्पन है छोटे लोग नहीं करते,\nदिल बड़ा रखो तो ज़िंदगी आसान हो जाती है।\nनफ़रत से कुछ नहीं मिलता,\nप्यार से सब कुछ बदल जाता है।",
    tags: ["forgiveness", "kindness", "wisdom"],
    category: "wisdom",
    background: "open hands",
  },
  {
    id: "p023",
    title: "धैर्य",
    lines: "धैर्य रखो सब्र का फल मीठा होता है,\nजल्दबाज़ी में कुछ नहीं मिलता।\nजो सब्र के साथ इंतज़ार करता है,\nउसकी किस्मत बदल जाती है।",
    tags: ["patience", "waiting", "faith"],
    category: "wisdom",
    background: "calm lake",
  },
  {
    id: "p024",
    title: "ज्ञान",
    lines: "ज्ञान ही असली शक्ति है दुनिया में,\nपैसा तो आता जाता रहता है।\nपढ़ते रहो सीखते रहो,\nज्ञानी इंसान हमेशा सम्मान पाता है।",
    tags: ["knowledge", "education", "wisdom"],
    category: "wisdom",
    background: "books library",
  },
  {
    id: "p025",
    title: "समय",
    lines: "समय बदलता है बदलते देर नहीं लगती,\nजो आज है कल नहीं होगा।\nइसलिए जो मिले उसे संभाल लो,\nकल का क्या पता क्या होगा।",
    tags: ["time", "change", "philosophy"],
    category: "wisdom",
    background: "hourglass",
  },

  // ─── Inspirational / Spiritual ──────────────────────────────────
  {
    id: "p026",
    title: "ईश्वर",
    lines: "ईश्वर सबके साथ है बस विश्वास रखो,\nदुआओं में सच्चाई रखो।\nजो दिल से माँगता है उसे मिलता है,\nबस भरोसा रखो।",
    tags: ["god", "faith", "prayer"],
    category: "spiritual",
    background: "temple light",
  },
  {
    id: "p027",
    title: "कर्म",
    lines: "कर्म करो फल की चिंता मत करो,\nअच्छे कर्म करोगे तो फल अच्छा मिलेगा।\nबुरे कर्म का फल बुरा होता है,\nइसलिए अच्छाई की राह पर चलो।",
    tags: ["karma", "dharma", "justice"],
    category: "spiritual",
    background: "balance scale",
  },
  {
    id: "p028",
    title: "शांति",
    lines: "शांति बाहर नहीं अंदर है,\nतलाश बाहर मत करो।\nजिसने अंदर झाँका उसे मिल गई,\nजो बाहर भटकता रहा वो खो गया।",
    tags: ["peace", "inner", "meditation"],
    category: "spiritual",
    background: "meditation garden",
  },
  {
    id: "p029",
    title: "अंधेरा",
    lines: "अंधेरा कितना भी गहरा हो,\nएक दीया काफ़ी है रोशन करने को।\nअंधेरे से मत डरो,\nबस एक छोटी सी कोशिश करो।",
    tags: ["darkness", "hope", "light"],
    category: "spiritual",
    background: "diya candle",
  },
  {
    id: "p030",
    title: "उड़ान",
    lines: "परिंदों की तरह उड़ान भरो,\nआसमान को छूकर दिखाओ।\nडर को पीछे छोड़ दो,\nहर मंज़िल को पाकर दिखाओ।",
    tags: ["flight", "freedom", "courage"],
    category: "motivation",
    background: "bird sky",
  },
  {
    id: "p031",
    title: "बदलाव",
    lines: "बदलाव ख़ुद से शुरू करो,\nदुनिया ख़ुद बदल जाएगी।\nजो बदलता है वो बढ़ता है,\nजो रुका है वो सड़ जाएगा।",
    tags: ["change", "growth", "self"],
    category: "wisdom",
    background: "butterfly",
  },
  {
    id: "p032",
    title: "ख़ुशी",
    lines: "ख़ुशी बड़ी चीज़ों में नहीं मिलती,\nछोटी-छोटी बातों में छुपी होती है।\nहँसना सीखो, हँसाना सीखो,\nयही असली ज़िंदगी है।",
    tags: ["happiness", "joy", "simple"],
    category: "friendship",
    background: "smile face",
  },
  {
    id: "p033",
    title: "हक़ीक़त",
    lines: "दुनिया में सब बनावट है,\nअसली बात दिल की सच्चाई है।\nजो दिल से लगाए रखे,\nउसकी कद्र करना सीखो।",
    tags: ["reality", "truth", "heart"],
    category: "wisdom",
    background: "mirror reflection",
  },
  {
    id: "p034",
    title: "रिश्ते",
    lines: "रिश्ते निभाना कोई खेल नहीं,\nये दिल से जुड़े होते हैं।\nजो रिश्ते दिल से निभाता है,\nउसकी दुनिया बदल जाती है।",
    tags: ["relationships", "bond", "care"],
    category: "friendship",
    background: "holding hands",
  },
  {
    id: "p035",
    title: "सपना",
    lines: "एक सपना देखा था बचपन में,\nकुछ कर दिखाना था दुनिया को।\nमेहनत करते-करते रातें गुज़ारीं,\nआज वो सपना सच हो रहा है।",
    tags: ["dream", "childhood", "achievement"],
    category: "motivation",
    background: "child dreaming",
  },
]

// ── Pre-built indexes ─────────────────────────────────────────────
const POEM_BY_ID = new Map(HINDI_POEMS.map((p) => [p.id, p]))

const POEMS_BY_CATEGORY = new Map()
for (const poem of HINDI_POEMS) {
  const list = POEMS_BY_CATEGORY.get(poem.category)
  if (list) list.push(poem)
  else POEMS_BY_CATEGORY.set(poem.category, [poem])
}

const ALL_TAGS = [...new Set(HINDI_POEMS.flatMap((p) => p.tags))]

// ── Fisher-Yates shuffle (in-place, O(n)) ─────────────────────────
const shuffleInPlace = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Get a single random poem.
 * @param {string[]} [excludeIds] - IDs to skip (e.g. already used today).
 */
export const getRandomPoem = (excludeIds = []) => {
  if (excludeIds.length === 0) {
    return HINDI_POEMS[Math.floor(Math.random() * HINDI_POEMS.length)]
  }
  const available = HINDI_POEMS.filter((p) => !excludeIds.includes(p.id))
  if (!available.length) return HINDI_POEMS[0]
  return available[Math.floor(Math.random() * available.length)]
}

/**
 * Get poem by ID — O(1) via Map lookup.
 */
export const getPoemById = (id) => POEM_BY_ID.get(id) || null

/**
 * Get poems filtered by tag.
 */
export const getPoemsByTag = (tag) => HINDI_POEMS.filter((p) => p.tags.includes(tag))

/**
 * Get poems filtered by category.
 */
export const getPoemsByCategory = (category) =>
  POEMS_BY_CATEGORY.get(category) || []

/**
 * Get all available tags.
 */
export const getAllTags = () => ALL_TAGS

/**
 * Get all available category names.
 */
export const getAllCategories = () => [...POEMS_BY_CATEGORY.keys()]

/**
 * Get N random unique poems using Fisher-Yates shuffle — O(n).
 * @param {number} count
 * @param {string[]} [excludeIds] - IDs to skip.
 */
export const getRandomPoems = (count = 3, excludeIds = []) => {
  let pool = excludeIds.length
    ? HINDI_POEMS.filter((p) => !excludeIds.includes(p.id))
    : HINDI_POEMS
  if (pool.length === 0) pool = HINDI_POEMS
  return shuffleInPlace([...pool]).slice(0, Math.min(count, pool.length))
}

/**
 * Resolve poem from request body: custom text, specific ID, or random unused.
 * Returns the poem object or null if none available.
 */
export const resolvePoem = ({ poemId, customPoem, background, excludeIds = [] }) => {
  if (customPoem && customPoem.trim().length > 0) {
    return {
      id: "custom",
      title: customPoem.split("\n")[0].trim().substring(0, 40),
      lines: customPoem.trim(),
      tags: ["custom"],
      category: "custom",
      background: background || "nature abstract",
    }
  }
  if (poemId) {
    return getPoemById(poemId)
  }
  return getRandomPoem(excludeIds)
}

export default HINDI_POEMS
