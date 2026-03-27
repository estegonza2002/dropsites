const ADJECTIVES = [
  'amber', 'azure', 'bold', 'brave', 'bright', 'calm', 'clear', 'clever',
  'cool', 'crisp', 'dark', 'deep', 'deft', 'dense', 'dry', 'dusty',
  'early', 'eager', 'epic', 'even', 'fair', 'fast', 'fine', 'firm',
  'flat', 'fresh', 'full', 'glad', 'gold', 'grand', 'great', 'green',
  'grey', 'hard', 'high', 'keen', 'kind', 'large', 'last', 'late',
  'lean', 'light', 'lone', 'long', 'loud', 'low', 'mild', 'mute',
  'near', 'neat', 'next', 'nice', 'nimble', 'noble', 'odd', 'open',
  'pale', 'plain', 'prime', 'pure', 'quick', 'quiet', 'rare', 'raw',
  'rich', 'round', 'sharp', 'shiny', 'slim', 'slow', 'small', 'smart',
  'soft', 'solid', 'still', 'strong', 'sure', 'swift', 'tall', 'tame',
  'tidy', 'tiny', 'true', 'vast', 'vivid', 'warm', 'wide', 'wild',
  'wise', 'young',
]

const NOUNS = [
  'bay', 'beam', 'bird', 'blaze', 'bloom', 'brook', 'calm', 'cave',
  'cliff', 'cloud', 'coast', 'cove', 'creek', 'dale', 'dawn', 'dune',
  'dust', 'field', 'fjord', 'flame', 'flare', 'flint', 'flow', 'foam',
  'fog', 'ford', 'forest', 'frost', 'glade', 'glen', 'grove', 'gulf',
  'gust', 'haze', 'hill', 'jade', 'lake', 'leaf', 'light', 'marsh',
  'mist', 'moon', 'moss', 'mountain', 'peak', 'pine', 'plain', 'rain',
  'reef', 'ridge', 'river', 'rock', 'root', 'sand', 'sea', 'shade',
  'shore', 'sky', 'slate', 'snow', 'spark', 'spring', 'star', 'stem',
  'stone', 'storm', 'stream', 'sun', 'tide', 'timber', 'trail', 'tree',
  'vale', 'valley', 'vine', 'void', 'wave', 'wind', 'wood', 'yard',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomTwoDigit(): number {
  return Math.floor(Math.random() * 90) + 10
}

export function generateSlug(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${randomTwoDigit()}`
}
