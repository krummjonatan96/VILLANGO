import { Injectable } from '@nestjs/common';
import { DatabaseRow } from '../../common/base.repository.js';
import { DatabaseService } from '../../core/database.service.js';

@Injectable()
export class AuthRepository {
  constructor(private readonly database: DatabaseService) {}

  createToken(userId: number, tokenHash: string) {
    return this.database.execute(
      `INSERT INTO api_tokens (usuario_id, token_hash, expira_en)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))`,
      [userId, tokenHash],
    );
  }

  createDriverToken(driverId: number, tokenHash: string) {
    return this.database.execute(
      `INSERT INTO api_tokens_chofer (chofer_id, token_hash, expira_en)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))`,
      [driverId, tokenHash],
    );
  }

  async findSession(tokenHash: string) {
    const rows = await this.database.query<DatabaseRow[]>(
      `SELECT u.*, t.id token_id FROM api_tokens t
       JOIN usuarios u ON u.id = t.usuario_id
       WHERE t.token_hash = ? AND (t.expira_en IS NULL OR t.expira_en > NOW()) LIMIT 1`,
      [tokenHash],
    );
    return rows[0];
  }

  async findDriverSession(tokenHash: string) {
    const rows = await this.database.query<DatabaseRow[]>(
      `SELECT c.*, t.id token_id FROM api_tokens_chofer t
       JOIN usuario_chofer c ON c.id = t.chofer_id
       WHERE t.token_hash = ? AND (t.expira_en IS NULL OR t.expira_en > NOW()) LIMIT 1`,
      [tokenHash],
    );
    return rows[0];
  }

  touchToken(id: number) { return this.database.execute('UPDATE api_tokens SET ultimo_uso = NOW() WHERE id = ?', [id]); }
  deleteToken(tokenHash: string) { return this.database.execute('DELETE FROM api_tokens WHERE token_hash = ?', [tokenHash]); }
  touchDriverToken(id: number) { return this.database.execute('UPDATE api_tokens_chofer SET ultimo_uso = NOW() WHERE id = ?', [id]); }
  deleteDriverToken(tokenHash: string) { return this.database.execute('DELETE FROM api_tokens_chofer WHERE token_hash = ?', [tokenHash]); }
}
