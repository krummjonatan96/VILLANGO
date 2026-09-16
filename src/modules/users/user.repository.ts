import { Injectable } from '@nestjs/common';
import { DatabaseRow } from '../../common/base.repository.js';
import { DatabaseService } from '../../core/database.service.js';
import { CreateUserDto, UpdateUserDto } from './user.dto.js';

@Injectable()
export class UserRepository {
  constructor(private readonly database: DatabaseService) {}

  create(user: CreateUserDto) {
    return this.database.execute(
      `INSERT INTO usuarios (nombre, apellido, celular, empresa, numero_carnet)
       VALUES (?, ?, ?, ?, ?)`,
      [user.nombre, user.apellido, user.celular, user.empresa, user.numero_carnet],
    ).then((result) => this.findById(result.insertId));
  }

  findAll() {
    return this.database.query<DatabaseRow[]>(
      `SELECT id, nombre, apellido, celular, empresa, numero_carnet
       FROM usuarios ORDER BY id DESC`,
    );
  }

  async findById(id: number) {
    const rows = await this.database.query<DatabaseRow[]>(
      `SELECT id, nombre, apellido, celular, empresa, numero_carnet
       FROM usuarios WHERE id = ? LIMIT 1`,
      [id],
    );
    if (rows.length === 0) throw new Error(`No existe el usuario con id ${id}`);
    return rows[0];
  }

  async update(id: number, user: UpdateUserDto) {
    const fields = Object.entries(user).filter(([, value]) => value !== undefined);
    const assignments = fields.map(([field]) => `${field} = ?`).join(', ');
    const result = await this.database.execute(
      `UPDATE usuarios SET ${assignments} WHERE id = ?`,
      [...fields.map(([, value]) => value), id],
    );
    if (result.affectedRows === 0) throw new Error(`No existe el usuario con id ${id}`);
    return this.findById(id);
  }

  findByCellphone(celular: string) {
    return this.database.query<DatabaseRow[]>(
      'SELECT * FROM usuarios WHERE celular = ? LIMIT 1',
      [celular],
    );
  }

  createAuthenticatedUser(data: { nombre: string; apellido: string; celular: string; password: string }) {
    return this.database.execute(
      `INSERT INTO usuarios (nombre, apellido, celular, password, rol, estado)
       VALUES (?, ?, ?, ?, 'PASAJERO', 'activo')`,
      [data.nombre, data.apellido, data.celular, data.password],
    );
  }

  findAuthenticatedById(id: number) {
    return this.database.query<DatabaseRow[]>('SELECT * FROM usuarios WHERE id = ? LIMIT 1', [id]);
  }
}
