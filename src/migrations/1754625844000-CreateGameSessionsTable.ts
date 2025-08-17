import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGameSessionsTable1754625844000
  implements MigrationInterface
{
  name = 'CreateGameSessionsTable1754625844000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."game_category_enum" AS ENUM (
        'Afrobeats',
        '90s R&B',
        'Hip Hop',
        'Pop',
        'Rock'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."game_session_status_enum" AS ENUM (
        'in_progress',
        'completed',
        'abandoned'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "game_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "score" integer NOT NULL DEFAULT 0,
        "category" "public"."game_category_enum" NOT NULL,
        "status" "public"."game_session_status_enum" NOT NULL DEFAULT 'in_progress',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "playerId" uuid,
        CONSTRAINT "PK_284f0c8c5775c09d725cb2e8a6e" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "game_sessions"
      ADD CONSTRAINT "FK_player_game_session"
      FOREIGN KEY ("playerId")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "game_sessions" DROP CONSTRAINT "FK_player_game_session"
    `);

    await queryRunner.query(`DROP TABLE "game_sessions"`);

    await queryRunner.query(`DROP TYPE "public"."game_session_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."game_category_enum"`);
  }
}
