import { Injectable } from '@nestjs/common';
import { ResultSetHeader } from 'mysql2/promise';
import { DatabaseRow } from '../../common/base.repository.js';
import { DatabaseService } from '../../core/database.service.js';

@Injectable()
export class WhatsAppOtpRepository {
  constructor(private readonly database: DatabaseService) {}

  create(phone: string, otpHash: string) {
    return this.database.execute(
      `INSERT INTO whatsapp_otps (phone, otp_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
      [phone, otpHash],
    );
  }

  async latestActive(phone: string) {
    const rows = await this.database.query<DatabaseRow[]>(
      `SELECT *, expires_at > NOW() AS is_unexpired FROM whatsapp_otps
       WHERE phone = ? AND verified_at IS NULL AND invalidated_at IS NULL
       ORDER BY id DESC LIMIT 1`,
      [phone],
    );
    return rows[0];
  }

  async latestForPhone(phone: string) {
    const rows = await this.database.query<DatabaseRow[]>(
      'SELECT id, created_at >= DATE_SUB(NOW(), INTERVAL 60 SECOND) AS recent FROM whatsapp_otps WHERE phone = ? ORDER BY id DESC LIMIT 1',
      [phone],
    );
    return rows[0];
  }

  async sentInLast15Minutes(phone: string) {
    const rows = await this.database.query<DatabaseRow[]>(
      'SELECT COUNT(*) AS total FROM whatsapp_otps WHERE phone = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)',
      [phone],
    );
    return Number(rows[0]?.total ?? 0);
  }

  markSent(id: number) { return this.database.execute('UPDATE whatsapp_otps SET sent_at = NOW() WHERE id = ?', [id]); }
  invalidate(id: number) { return this.database.execute('UPDATE whatsapp_otps SET invalidated_at = NOW() WHERE id = ? AND verified_at IS NULL', [id]); }
  incrementAttempts(id: number) { return this.database.execute('UPDATE whatsapp_otps SET attempts = attempts + 1 WHERE id = ?', [id]); }
  verify(id: number) { return this.database.execute('UPDATE whatsapp_otps SET verified_at = NOW(), invalidated_at = NOW() WHERE id = ? AND verified_at IS NULL', [id]); }
  insertId(result: unknown) { return (result as ResultSetHeader).insertId; }
}
