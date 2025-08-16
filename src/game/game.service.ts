import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Lyrics } from 'src/lyrics/entities/lyrics.entity';
import { Repository } from 'typeorm';

export interface RandomLyricOptions {
  category?: string;
  decade?: string;
  genre?: string;
  excludeIds?: number[];
}

export interface GuessDto {
  lyricId: number;
  guessType: 'artist' | 'songTitle';
  guessValue: string;
}

export interface GuessResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation?: string;
  points?: number;
}

export interface GameLyric {
  id: number;
  lyricSnippet: string;
  songTitle: string;
  artist: string;
  category?: string;
  decade?: string;
  genre?: string;
}

@Injectable()
export class GameLogicService {
  private readonly logger = new Logger(GameLogicService.name);

  // Points system configuration
  private readonly CORRECT_GUESS_POINTS = 100;
  private readonly PARTIAL_MATCH_POINTS = 50;

  constructor(
    @InjectRepository(Lyrics)
    private lyricsRepository: Repository<Lyrics>,
  ) {}

  /**
   * Fetches a random lyric from the database with optional filtering
   * @param options - Filtering options for category, decade, genre, and exclusions
   * @returns Promise<GameLyric> - Random lyric for the game
   */
  async getRandomLyric(options: RandomLyricOptions = {}): Promise<GameLyric> {
    this.logger.debug(
      `Fetching random lyric with options: ${JSON.stringify(options)}`,
    );

    try {
      // Build the query with optional filters
      const queryBuilder = this.lyricsRepository
        .createQueryBuilder('lyrics')
        .select([
          'lyrics.id',
          'lyrics.lyricSnippet',
          'lyrics.songTitle',
          'lyrics.artist',
          'lyrics.category',
          'lyrics.decade',
          'lyrics.genre',
        ]);

      // Apply filters if provided
      if (options.category) {
        queryBuilder.andWhere('LOWER(lyrics.category) = LOWER(:category)', {
          category: options.category,
        });
      }

      if (options.decade) {
        queryBuilder.andWhere('lyrics.decade = :decade', {
          decade: options.decade,
        });
      }

      if (options.genre) {
        queryBuilder.andWhere('LOWER(lyrics.genre) = LOWER(:genre)', {
          genre: options.genre,
        });
      }

      // Exclude previously shown lyrics in the session
      if (options.excludeIds && options.excludeIds.length > 0) {
        queryBuilder.andWhere('lyrics.id NOT IN (:...excludeIds)', {
          excludeIds: options.excludeIds,
        });
      }

      // Get total count for random selection
      const totalCount = await queryBuilder.getCount();

      if (totalCount === 0) {
        throw new NotFoundException(
          'No lyrics found matching the specified criteria',
        );
      }

      // Generate random offset
      const randomOffset = Math.floor(Math.random() * totalCount);

      // Fetch the random lyric
      const lyric = await queryBuilder.skip(randomOffset).take(1).getOne();

      if (!lyric) {
        throw new NotFoundException('Failed to fetch random lyric');
      }

      this.logger.debug(
        `Selected lyric ID: ${lyric.id} from ${totalCount} available options`,
      );

      return {
        id: lyric.id,
        lyricSnippet: lyric.lyricSnippet,
        songTitle: lyric.songTitle,
        artist: lyric.artist,
        category: lyric.category,
        decade: lyric.decade,
        genre: lyric.genre,
      };
    } catch (error) {
      this.logger.error('Error fetching random lyric', error.stack);
      throw error;
    }
  }

  /**
   * Checks if a player's guess is correct
   * @param guessDto - The guess data containing lyricId, guessType, and guessValue
   * @returns Promise<GuessResult> - Result of the guess evaluation
   */
  async checkGuess(guessDto: GuessDto): Promise<GuessResult> {
    this.logger.debug(`Checking guess: ${JSON.stringify(guessDto)}`);

    try {
      // Fetch the lyric from database
      const lyric = await this.lyricsRepository.findOne({
        where: { id: guessDto.lyricId },
      });

      if (!lyric) {
        throw new NotFoundException(
          `Lyric with ID ${guessDto.lyricId} not found`,
        );
      }

      // Get the correct answer based on guess type
      const correctAnswer =
        guessDto.guessType === 'artist' ? lyric.artist : lyric.songTitle;

      // Normalize strings for comparison
      const normalizedGuess = this.normalizeString(guessDto.guessValue);
      const normalizedAnswer = this.normalizeString(correctAnswer);

      // Check for exact match
      const isExactMatch = normalizedGuess === normalizedAnswer;

      // Check for partial match (contains the correct answer or vice versa)
      const isPartialMatch =
        !isExactMatch &&
        (normalizedGuess.includes(normalizedAnswer) ||
          normalizedAnswer.includes(normalizedGuess));

      // Calculate points
      let points = 0;
      if (isExactMatch) {
        points = this.CORRECT_GUESS_POINTS;
      } else if (isPartialMatch && normalizedGuess.length >= 3) {
        points = this.PARTIAL_MATCH_POINTS;
      }

      const isCorrect = isExactMatch || isPartialMatch;

      // Generate explanation
      let explanation = '';
      if (isCorrect) {
        if (isExactMatch) {
          explanation = `Correct! This line is from "${lyric.songTitle}" by ${lyric.artist}.`;
        } else {
          explanation = `Close enough! The exact answer is "${correctAnswer}" from "${lyric.songTitle}" by ${lyric.artist}.`;
        }
      } else {
        explanation = `Incorrect. The correct answer is "${correctAnswer}" from "${lyric.songTitle}" by ${lyric.artist}.`;
      }

      const result: GuessResult = {
        isCorrect,
        correctAnswer,
        explanation,
        points,
      };

      this.logger.debug(`Guess result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error('Error checking guess', error.stack);
      throw error;
    }
  }

  /**
   * Gets multiple random lyrics for batch operations
   * @param count - Number of lyrics to fetch
   * @param options - Filtering options
   * @returns Promise<GameLyric[]> - Array of random lyrics
   */
  async getMultipleRandomLyrics(
    count: number,
    options: RandomLyricOptions = {},
  ): Promise<GameLyric[]> {
    this.logger.debug(`Fetching ${count} random lyrics`);

    const lyrics: GameLyric[] = [];
    const excludeIds = options.excludeIds || [];

    for (let i = 0; i < count; i++) {
      try {
        const lyric = await this.getRandomLyric({
          ...options,
          excludeIds: [...excludeIds, ...lyrics.map((l) => l.id)],
        });
        lyrics.push(lyric);
      } catch (error) {
        this.logger.warn(
          `Could only fetch ${lyrics.length} out of ${count} requested lyrics`,
        );
        break;
      }
    }

    return lyrics;
  }

  /**
   * Gets statistics about available lyrics
   * @param options - Optional filtering
   * @returns Promise with counts and categories
   */
  async getLyricStats(options: Partial<RandomLyricOptions> = {}) {
    this.logger.debug('Fetching lyric statistics');

    try {
      const queryBuilder = this.lyricsRepository.createQueryBuilder('lyrics');

      // Apply filters if provided
      if (options.category) {
        queryBuilder.andWhere('LOWER(lyrics.category) = LOWER(:category)', {
          category: options.category,
        });
      }

      if (options.decade) {
        queryBuilder.andWhere('lyrics.decade = :decade', {
          decade: options.decade,
        });
      }

      if (options.genre) {
        queryBuilder.andWhere('LOWER(lyrics.genre) = LOWER(:genre)', {
          genre: options.genre,
        });
      }

      const [totalCount, categories, decades, genres] = await Promise.all([
        queryBuilder.getCount(),
        this.lyricsRepository
          .createQueryBuilder('lyrics')
          .select('DISTINCT lyrics.category', 'category')
          .where('lyrics.category IS NOT NULL')
          .getRawMany(),
        this.lyricsRepository
          .createQueryBuilder('lyrics')
          .select('DISTINCT lyrics.decade', 'decade')
          .where('lyrics.decade IS NOT NULL')
          .orderBy('lyrics.decade', 'ASC')
          .getRawMany(),
        this.lyricsRepository
          .createQueryBuilder('lyrics')
          .select('DISTINCT lyrics.genre', 'genre')
          .where('lyrics.genre IS NOT NULL')
          .getRawMany(),
      ]);

      return {
        totalCount,
        availableCategories: categories.map((c) => c.category).filter(Boolean),
        availableDecades: decades.map((d) => d.decade).filter(Boolean),
        availableGenres: genres.map((g) => g.genre).filter(Boolean),
      };
    } catch (error) {
      this.logger.error('Error fetching lyric statistics', error.stack);
      throw error;
    }
  }

  /**
   * Validates if a guess is reasonable (not empty, reasonable length)
   * @param guess - The guess string to validate
   * @returns boolean - Whether the guess is valid
   */
  validateGuess(guess: string): { isValid: boolean; reason?: string } {
    if (!guess || typeof guess !== 'string') {
      return { isValid: false, reason: 'Guess cannot be empty' };
    }

    const trimmedGuess = guess.trim();
    if (trimmedGuess.length === 0) {
      return { isValid: false, reason: 'Guess cannot be empty' };
    }

    if (trimmedGuess.length > 200) {
      return {
        isValid: false,
        reason: 'Guess is too long (max 200 characters)',
      };
    }

    if (trimmedGuess.length < 1) {
      return { isValid: false, reason: 'Guess is too short' };
    }

    return { isValid: true };
  }

  /**
   * Normalizes a string for comparison by removing punctuation,
   * extra whitespace, and converting to lowercase
   * @param str - String to normalize
   * @returns Normalized string
   */
  private normalizeString(str: string): string {
    if (!str) return '';

    return (
      str
        .toLowerCase()
        .trim()
        // Remove common punctuation and special characters
        .replace(/[^\w\s]/g, '')
        // Replace multiple whitespaces with single space
        .replace(/\s+/g, ' ')
        .trim()
    );
  }
}
