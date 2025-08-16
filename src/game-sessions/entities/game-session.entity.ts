import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum GameSessionStatus {
  WAITING_FOR_PLAYER = 'waiting_for_player',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export enum GameCategory {
  AFROBEATS = 'Afrobeats',
  NINETIES_RNB = '90s R&B',
  HIP_HOP = 'Hip Hop',
  POP = 'Pop',
  ROCK = 'Rock',
}

export enum GameMode {
  SINGLE_PLAYER = 'single_player',
  MULTIPLAYER = 'multiplayer',
  WAGERED = 'wagered',
}

@Entity('game_sessions')
export class GameSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Primary player (creator of the session)
  @ManyToOne(() => User, (user) => user.gameSessions)
  player: User;

  // Second player for multiplayer/wagered games
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'playerTwoId' })
  playerTwo: User;

  @Column({ type: 'uuid', nullable: true })
  playerTwoId: string;

  @Column({ type: 'int', default: 0 })
  score: number;

  // Score for player two in multiplayer games
  @Column({ type: 'int', default: 0 })
  playerTwoScore: number;

  @Column({
    type: 'enum',
    enum: GameCategory,
  })
  category: GameCategory;

  @Column({
    type: 'enum',
    enum: GameMode,
    default: GameMode.SINGLE_PLAYER,
  })
  mode: GameMode;

  @Column({
    type: 'enum',
    enum: GameSessionStatus,
    default: GameSessionStatus.IN_PROGRESS,
  })
  status: GameSessionStatus;

  // Winner of the game (for multiplayer sessions)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'winnerId' })
  winner: User;

  @Column({ type: 'uuid', nullable: true })
  winnerId: string;

  // Wager amount for wagered games
  @Column({ type: 'int', nullable: true })
  wagerAmount: number;

  // Whether this session has an active wager
  @Column({ type: 'boolean', default: false })
  hasWager: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}
