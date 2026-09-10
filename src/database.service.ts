import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mysql, { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { CreateUserDto, UpdateUserDto } from './user.dto.js';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool | null;
  private connected = false;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('DB_HOST');
    const user = this.configService.get<string>('DB_USER');
    const password = this.configService.get<string>('DB_PASSWORD');
    const database = this.configService.get<string>('DB_NAME');

    this.pool = host && user && password && database
      ? mysql.createPool({
          host,
          user,
          password,
          database,
          port: this.configService.get<number>('DB_PORT', 3306),
          waitForConnections: true,
          connectionLimit: 5,
        })
      : null;
  }

  async onModuleInit() {
    if (!this.pool) {
      this.logger.warn('MySQL no configurado. Define DB_HOST, DB_USER, DB_PASSWORD y DB_NAME.');
      return;
    }

    try {
      await this.pool.query('SELECT 1');
      this.connected = true;
      this.logger.log('MySQL conectado correctamente.');
    } catch (error) {
      this.logger.error('No se pudo conectar a MySQL.', error);
    }
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  getStatus() {
    return {
      connected: this.connected,
      database: this.configService.get<string>('DB_NAME') ?? null,
      host: this.configService.get<string>('DB_HOST') ?? null,
    };
  }

  async createUser(user: CreateUserDto) {
    const pool = this.getPool();

    try {
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO usuarios (nombre, apellido, celular, empresa, numero_carnet)
         VALUES (?, ?, ?, ?, ?)`,
        [user.nombre, user.apellido, user.celular, user.empresa, user.numero_carnet],
      );

      return this.getUserById(result.insertId);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getUsers() {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, nombre, apellido, celular, empresa, numero_carnet
       FROM usuarios ORDER BY id DESC`,
    );
    return rows;
  }

  async getUserById(id: number) {
    const pool = this.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, nombre, apellido, celular, empresa, numero_carnet
       FROM usuarios WHERE id = ? LIMIT 1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundException(`No existe el usuario con id ${id}`);
    }

    return rows[0];
  }

  async updateUser(id: number, user: UpdateUserDto) {
    const pool = this.getPool();
    const fields = Object.entries(user).filter(([, value]) => value !== undefined);

    if (fields.length === 0) {
      throw new ConflictException('Debes enviar al menos un campo para actualizar.');
    }

    const assignments = fields.map(([field]) => `${field} = ?`).join(', ');
    const values = fields.map(([, value]) => value);

    try {
      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE usuarios SET ${assignments} WHERE id = ?`,
        [...values, id],
      );

      if (result.affectedRows === 0) {
        throw new NotFoundException(`No existe el usuario con id ${id}`);
      }

      return this.getUserById(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.handleDatabaseError(error);
    }
  }

  private getPool() {
    if (!this.pool || !this.connected) {
      throw new InternalServerErrorException('La base de datos no está conectada.');
    }
    return this.pool;
  }

  private handleDatabaseError(error: unknown): never {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') {
      throw new ConflictException('El numero_carnet ya existe.');
    }
    this.logger.error('Error ejecutando una operación en MySQL.', error);
    throw new InternalServerErrorException('Error al consultar la base de datos.');
  }
}