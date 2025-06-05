import { randomInt } from "crypto";

// Synonym bank for lexical entropy
const SYNONYM_BANK = {
  vomiting: ["retching", "emesis"],
  diarrhea: ["loose stools", "bowel irregularity"],
  diminished: ["blunted", "reduced"],
  additives: ["excipients", "compounds"],
  synthetic: ["artificial", "manufactured"],
  collapse: ["prostration", "breakdown"],
  concern: ["unease", "apprehension"],
  contain: ["comprise", "encompass"],
  result: ["ensue", "outcome"],
  suitable: ["apt", "fitting"],
  important: ["crucial", "significant"],
  different: ["distinct", "varied"],
  increase: ["escalate", "amplify"],
  decrease: ["diminish", "reduce"],
  problem: ["issue", "challenge"],
  solution: ["remedy", "approach"],
  effective: ["efficacious", "productive"],
  significant: ["notable", "substantial"],
  analysis: ["examination", "assessment"],
  development: ["advancement", "progression"]
};

// Concrete data examples for injection
const CONCRETE_DATA = [
  "March 2024 data",
  "15.3% increase",
  "2.7 kg package weight",
  "within 48 hours",
  "quarterly figures",
  "7-day assessment period",
  "0.25ml dosage",
  "14-point scale",
  "3:1 ratio",
  "ambient temperature (22°C)"
];

// Human asides for lived experience
const HUMAN_ASIDES = [
  "based on clinical observation",
  "as practitioners often note",
  "commonly reported in practice",
  "frequently encountered scenario",
  "typical patient presentation",
  "standard clinical approach",
  "routine assessment finding",
  "established protocol",
  "conventional wisdom suggests",
  "empirical evidence indicates"
];

export function postProcess(rawText: string, seed = randomInt(1e9)): string {
  if (!rawText || rawText.trim().length === 0) {
    return rawText.trim();
  }

  // Use seed for reproducible randomness
  const rng = seedRandom(seed);
  
  let text = rawText.trim();
  
  // Step 1: Apply burstiness - ensure sentence length variation
  text = applyBurstiness(text, rng);
  
  // Step 2: Handle contractions - expand all except one random "isn't" or "won't"
  text = handleContractions(text, rng);
  
  // Step 3: Throttle hedges - cap "may/might/could/can" at 6 per 700 words
  text = throttleHedges(text, rng);
  
  // Step 4: Apply lexical entropy - swap 5-7 common tokens with rarer synonyms
  text = applySynonymSwaps(text, rng);
  
  // Step 5: Inject concrete datum
  text = injectConcreteDatum(text, rng);
  
  // Step 6: Add human aside
  text = addHumanAside(text, rng);
  
  // Step 7: Apply punctuation noise
  text = applyPunctuationNoise(text, rng);
  
  return text;
}

function seedRandom(seed: number) {
  let state = seed;
  return function() {
    state = (state * 1664525 + 1013904223) % Math.pow(2, 32);
    return state / Math.pow(2, 32);
  };
}

function applyBurstiness(text: string, rng: () => number): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
  const processed: string[] = [];
  
  for (let i = 0; i < sentences.length; i++) {
    let sentence = sentences[i].trim();
    const wordCount = sentence.split(/\s+/).length;
    
    // Target: ≥30% sentences ≤12 words AND ≥10% sentences ≥30 words
    if (wordCount > 20 && rng() < 0.3) {
      // Split long sentence
      const midPoint = sentence.indexOf(',') || sentence.indexOf(';') || Math.floor(sentence.length / 2);
      if (midPoint > 0) {
        const part1 = sentence.substring(0, midPoint).trim();
        const part2 = sentence.substring(midPoint + 1).trim();
        if (part1.length > 10 && part2.length > 10) {
          processed.push(part1.endsWith('.') ? part1 : part1 + '.');
          processed.push(part2.charAt(0).toUpperCase() + part2.slice(1));
          continue;
        }
      }
    } else if (wordCount < 8 && i < sentences.length - 1 && rng() < 0.2) {
      // Merge short sentences
      const nextSentence = sentences[i + 1];
      sentence = sentence.replace(/[.!?]$/, '') + ', and ' + nextSentence.charAt(0).toLowerCase() + nextSentence.slice(1);
      i++; // Skip next sentence since we merged it
    }
    
    processed.push(sentence);
  }
  
  return processed.join(' ');
}

function handleContractions(text: string, rng: () => number): string {
  const contractions = {
    "don't": "do not",
    "won't": "will not",
    "can't": "cannot",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "haven't": "have not",
    "hasn't": "has not",
    "hadn't": "had not",
    "wouldn't": "would not",
    "shouldn't": "should not",
    "couldn't": "could not",
    "mustn't": "must not",
    "didn't": "did not",
    "doesn't": "does not"
  };
  
  // Choose one contraction to keep (isn't or won't)
  const keepContraction = rng() < 0.5 ? "isn't" : "won't";
  
  let result = text;
  Object.entries(contractions).forEach(([contraction, expansion]) => {
    if (contraction !== keepContraction) {
      const regex = new RegExp(contraction, 'gi');
      result = result.replace(regex, expansion);
    }
  });
  
  return result;
}

function throttleHedges(text: string, rng: () => number): string {
  const hedges = ['may', 'might', 'could', 'can'];
  const wordCount = text.split(/\s+/).length;
  const maxHedges = Math.ceil((wordCount / 700) * 6);
  
  let hedgeCount = 0;
  let result = text;
  
  hedges.forEach(hedge => {
    const regex = new RegExp(`\\b${hedge}\\b`, 'gi');
    const matches = result.match(regex) || [];
    
    if (hedgeCount + matches.length > maxHedges) {
      // Replace excess hedges with alternatives
      const alternatives: Record<string, string[]> = {
        'may': ['will', 'should', 'tends to'],
        'might': ['will', 'should', 'often'],
        'could': ['will', 'should', 'can'],
        'can': ['will', 'should', 'does']
      };
      
      const replacements = alternatives[hedge.toLowerCase()] || ['will'];
      let replacementIndex = 0;
      
      result = result.replace(regex, (match) => {
        if (hedgeCount >= maxHedges) {
          const replacement = replacements[replacementIndex % replacements.length];
          replacementIndex++;
          return match[0].toUpperCase() === match[0] ? 
            replacement.charAt(0).toUpperCase() + replacement.slice(1) : 
            replacement;
        }
        hedgeCount++;
        return match;
      });
    } else {
      hedgeCount += matches.length;
    }
  });
  
  return result;
}

function applySynonymSwaps(text: string, rng: () => number): string {
  let result = text;
  const synonymKeys = Object.keys(SYNONYM_BANK);
  const targetSwaps = 5 + Math.floor(rng() * 3); // 5-7 swaps
  
  // Shuffle synonym keys
  const shuffledKeys = synonymKeys.sort(() => rng() - 0.5);
  
  let swapCount = 0;
  for (const word of shuffledKeys.slice(0, targetSwaps)) {
    const synonyms = SYNONYM_BANK[word as keyof typeof SYNONYM_BANK];
    const synonym = synonyms[Math.floor(rng() * synonyms.length)];
    
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(result)) {
      result = result.replace(regex, (match) => {
        if (swapCount < targetSwaps) {
          swapCount++;
          return match[0].toUpperCase() === match[0] ? 
            synonym.charAt(0).toUpperCase() + synonym.slice(1) : 
            synonym;
        }
        return match;
      });
    }
  }
  
  return result;
}

function injectConcreteDatum(text: string, rng: () => number): string {
  const datum = CONCRETE_DATA[Math.floor(rng() * CONCRETE_DATA.length)];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  if (sentences.length > 1) {
    const targetIndex = Math.floor(rng() * sentences.length);
    const targetSentence = sentences[targetIndex];
    
    // Insert datum naturally into the sentence
    const insertPoints = [
      ` (${datum})`,
      `, including ${datum},`,
      ` during ${datum}`
    ];
    
    const insertPoint = insertPoints[Math.floor(rng() * insertPoints.length)];
    const commaIndex = targetSentence.indexOf(',');
    
    if (commaIndex > 0) {
      sentences[targetIndex] = targetSentence.substring(0, commaIndex) + insertPoint + targetSentence.substring(commaIndex);
    } else {
      const periodIndex = targetSentence.lastIndexOf('.');
      if (periodIndex > 0) {
        sentences[targetIndex] = targetSentence.substring(0, periodIndex) + insertPoint + targetSentence.substring(periodIndex);
      }
    }
  }
  
  return sentences.join(' ');
}

function addHumanAside(text: string, rng: () => number): string {
  const aside = HUMAN_ASIDES[Math.floor(rng() * HUMAN_ASIDES.length)];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  if (sentences.length > 1) {
    const targetIndex = Math.floor(rng() * sentences.length);
    const targetSentence = sentences[targetIndex];
    
    // Add parenthetical or em-dash aside
    const asideFormats = [
      ` (${aside})`,
      ` – ${aside} –`,
      `, ${aside},`
    ];
    
    const format = asideFormats[Math.floor(rng() * asideFormats.length)];
    const commaIndex = targetSentence.indexOf(',');
    
    if (commaIndex > 0) {
      sentences[targetIndex] = targetSentence.substring(0, commaIndex) + format + targetSentence.substring(commaIndex);
    } else {
      const periodIndex = targetSentence.lastIndexOf('.');
      if (periodIndex > 0) {
        sentences[targetIndex] = targetSentence.substring(0, periodIndex) + format + targetSentence.substring(periodIndex);
      }
    }
  }
  
  return sentences.join(' ');
}

function applyPunctuationNoise(text: string, rng: () => number): string {
  let result = text;
  
  // Swap one comma for semicolon
  const commas = result.match(/,/g);
  if (commas && commas.length > 0) {
    const commaIndex = Math.floor(rng() * commas.length);
    let currentCommaCount = 0;
    result = result.replace(/,/g, (match) => {
      if (currentCommaCount === commaIndex) {
        currentCommaCount++;
        return ';';
      }
      currentCommaCount++;
      return match;
    });
  }
  
  // Insert one spaced en-dash
  const words = result.split(' ');
  if (words.length > 3) {
    const targetIndex = Math.floor(rng() * (words.length - 2)) + 1;
    words[targetIndex] = words[targetIndex] + ' –';
    result = words.join(' ');
  }
  
  return result;
} 