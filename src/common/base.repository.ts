import { Injectable, NotFoundException } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../core/database.service.js';

export type DatabaseRow = RowDataPacket & Record<string, unknown>;

export type FieldMap = Record<string, unknown>;

@Injectable()
export abstract class BaseRepository {
  protected constructor(
    protected readonly database: DatabaseService,
    private readonly table: string,
    private readonly fields: readonly string[],
  ) {}

  async findAll() {
    return this.database.query<DatabaseRow[]>(
      `SELECT * FROM ${this.table} ORDER BY id DESC`,
    );
  }

  async findById(id: number) {
    const rows = await this.database.query<DatabaseRow[]>(
      `SELECT * FROM ${this.table} WHERE id = ? LIMIT 1`,
      [id],
    );
    if (rows.length === 0) {
      throw new NotFoundException(`No existe un registro de ${this.table} con id ${id}`);
    }
    return rows[0];
  }

  async create(data: FieldMap) {
    const entries = this.fields
      .map((field) => [field, data[field]] as const)
      .filter(([, value]) => value !== undefined);
    const columns = entries.map(([field]) => field).join(', ');
    const placeholders = entries.map(() => '?').join(', ');
    const result = await this.database.execute(
      `INSERT INTO ${this.table} (${columns}) VALUES (${placeholders})`,
      entries.map(([, value]) => value),
    );
    return this.findById((result as ResultSetHeader).insertId);
  }

  async update(id: number, data: FieldMap) {
    const entries = this.fields
      .map((field) => [field, data[field]] as const)
      .filter(([, value]) => value !== undefined);
    if (entries.length === 0) {
      return this.findById(id);
    }
    const assignments = entries.map(([field]) => `${field} = ?`).join(', ');
    const result = await this.database.execute(
      `UPDATE ${this.table} SET ${assignments} WHERE id = ?`,
      [...entries.map(([, value]) => value), id],
    );
    if ((result as ResultSetHeader).affectedRows === 0) {
      throw new NotFoundException(`No existe un registro de ${this.table} con id ${id}`);
    }
    return this.findById(id);
  }

  async remove(id: number) {
    const result = await this.database.execute(
      `DELETE FROM ${this.table} WHERE id = ?`,
      [id],
    );
    if ((result as ResultSetHeader).affectedRows === 0) {
      throw new NotFoundException(`No existe un registro de ${this.table} con id ${id}`);
    }
    return { success: true, id };
  }
}
