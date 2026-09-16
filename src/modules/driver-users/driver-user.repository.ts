import { Injectable } from '@nestjs/common';
import { ResultSetHeader } from 'mysql2/promise';
import { BaseRepository, DatabaseRow, FieldMap } from '../../common/base.repository.js';
import { DatabaseService } from '../../core/database.service.js';

@Injectable()
export class DriverUserRepository extends BaseRepository {
  constructor(database: DatabaseService) {
    super(database, 'usuario_chofer', [
      'nombre',
      'apellido',
      'celular',
      'usuario',
      'email',
      'password',
      'rol',
      'numero_carnet',
      'licencia_conducir',
      'fecha_vencimiento_licencia',
      'foto_perfil',
      'estado',
      'estado_disponibilidad',
    ]);
  }

  findByCellphone(celular: string) {
    return this.database.query<DatabaseRow[]>(
      'SELECT * FROM usuario_chofer WHERE celular = ? LIMIT 1',
      [celular],
    );
  }

  findByUsernameOrCellphone(usuario: string) {
    return this.database.query<DatabaseRow[]>(
      'SELECT * FROM usuario_chofer WHERE usuario = ? OR celular = ? LIMIT 1',
      [usuario, usuario],
    );
  }

  findByCarnet(numeroCarnet: string) {
    return this.database.query<DatabaseRow[]>(
      'SELECT * FROM usuario_chofer WHERE numero_carnet = ? LIMIT 1',
      [numeroCarnet],
    );
  }

  findByLicense(licenciaConducir: string) {
    return this.database.query<DatabaseRow[]>(
      'SELECT * FROM usuario_chofer WHERE licencia_conducir = ? LIMIT 1',
      [licenciaConducir],
    );
  }

  async updateStatus(id: number, estado: string) {
    return this.update(id, { estado });
  }

  async updateAvailability(id: number, estadoDisponibilidad: string) {
    return this.update(id, { estado_disponibilidad: estadoDisponibilidad });
  }

  async create(data: FieldMap) {
    const result = await super.create(data);
    return this.withoutPassword(result);
  }

  async update(id: number, data: FieldMap) {
    const result = await super.update(id, data);
    return this.withoutPassword(result);
  }

  async findAll() {
    const rows = await super.findAll();
    return rows.map((row) => this.withoutPassword(row));
  }

  async findById(id: number) {
    const row = await super.findById(id);
    return this.withoutPassword(row);
  }

  async rawCreate(data: FieldMap) {
    const result = await this.database.execute(
      `INSERT INTO usuario_chofer (
        nombre, apellido, celular, email, password, rol, numero_carnet,
        licencia_conducir, fecha_vencimiento_licencia, foto_perfil,
        estado, estado_disponibilidad
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.nombre,
        data.apellido,
        data.celular,
        data.email ?? null,
        data.password,
        data.rol ?? 'CONDUCTOR',
        data.numero_carnet,
        data.licencia_conducir,
        data.fecha_vencimiento_licencia ?? null,
        data.foto_perfil ?? null,
        data.estado ?? 'pendiente',
        data.estado_disponibilidad ?? 'offline',
      ],
    );
    return this.findById((result as ResultSetHeader).insertId);
  }

  private withoutPassword(row: DatabaseRow) {
    const { password: _password, ...safeRow } = row;
    return safeRow;
  }
}
