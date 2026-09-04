export const ANIMAL_AVATARS = [
  { emoji: '🦊', name: 'Cyber Fox', color: '#f97316' },
  { emoji: '🦁', name: 'Alpha Lion', color: '#eab308' },
  { emoji: '🐯', name: 'Neon Tiger', color: '#ea580c' },
  { emoji: '🐼', name: 'Zen Panda', color: '#06b6d4' },
  { emoji: '🐺', name: 'Shadow Wolf', color: '#6366f1' },
  { emoji: '🦅', name: 'Sky Eagle', color: '#3b82f6' },
  { emoji: '🐉', name: 'Storm Dragon', color: '#0284c7' },
  { emoji: '🦄', name: 'Mystic Unicorn', color: '#ec4899' }
];

export const getAnimalAvatar = (username) => {
  if (!username) return ANIMAL_AVATARS[0];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ANIMAL_AVATARS.length;
  return ANIMAL_AVATARS[index];
};
