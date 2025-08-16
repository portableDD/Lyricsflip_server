export const GAME_CONSTANTS = {
  POINTS: {
    CORRECT_GUESS: 100,
    PARTIAL_MATCH: 50,
    STREAK_BONUS: 25,
    DIFFICULTY_MULTIPLIER: {
      easy: 1,
      medium: 1.5,
      hard: 2,
    },
  },
  LIMITS: {
    MAX_LYRICS_PER_REQUEST: 20,
    MAX_GUESS_LENGTH: 200,
    MIN_GUESS_LENGTH: 1,
    SESSION_TIMEOUT_MINUTES: 30,
  },
  VALIDATION: {
    MIN_PARTIAL_MATCH_LENGTH: 3,
  },
} as const;
