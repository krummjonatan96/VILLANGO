import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ResultSetHeader } from 'mysql2/promise';
import { DatabaseService } from '../../core/database.service.js';
import { RegisterConductorWithVehicleDto, UpdateDriverProfileDto } from './mobility.dto.js';
import { AuthService } from '../auth/auth.service.js';

@Injectable()
export class DriverRegistrationService {
  constructor(private readonly database: DatabaseService, private readonly authService: AuthService) {}

  async register(dto: RegisterConductorWithVehicleDto) {
    const id = await this.database.transaction(async (connection) => {
      const errors: Record<string, string[]> = {};
      const [[carnet]] = await connection.query<any[]>(
        'SELECT id FROM conductor WHERE dni_ci = ? LIMIT 1', [dto.numero_carnet],
      );
      const [[celular]] = await connection.query<any[]>(
        'SELECT id FROM conductor WHERE telefono = ? LIMIT 1', [dto.celular],
      );
      const [[licencia]] = await connection.query<any[]>(
        'SELECT id FROM conductor WHERE licencia = ? LIMIT 1', [dto.numero_licencia],
      );
      const [[usuario]] = await connection.query<any[]>(
        'SELECT id FROM usuario_chofer WHERE usuario = ? LIMIT 1', [dto.usuario],
      );
      const [[placa]] = dto.vehiculo
        ? await connection.query<any[]>('SELECT id FROM vehiculos WHERE placa = ? LIMIT 1', [dto.vehiculo.placa])
        : [[undefined]];
      if (carnet) errors.numero_carnet = ['El número de carnet ya está registrado'];
      if (celular) errors.celular = ['El celular ya está registrado'];
      if (licencia) errors.numero_licencia = ['El número de licencia ya está registrado'];
      if (placa) errors['vehiculo.placa'] = ['La placa ya está registrada'];
      if (Object.keys(errors).length) throw new UnprocessableEntityException({ message: 'Datos inválidos', errors });

      if (usuario) errors.usuario = ['El usuario ya esta registrado'];
      if (Object.keys(errors).length) throw new UnprocessableEntityException({ errors });

      const [conductor] = await connection.execute<ResultSetHeader>(
        `INSERT INTO conductor (
          nombre, dni_ci, telefono, licencia, estado_disponibilidad, estado_global,
          nombre_completo, numero_carnet, celular, numero_licencia, foto_perfil, estado
        ) VALUES (?, ?, ?, ?, 'offline', 'en_verificacion', ?, ?, ?, ?, ?, 'PENDIENTE')`,
        [
          dto.nombre_completo, dto.numero_carnet, dto.celular, dto.numero_licencia,
          dto.nombre_completo, dto.numero_carnet, dto.celular, dto.numero_licencia, dto.foto_perfil ?? null,
        ],
      );
      if (dto.vehiculo) {
        await connection.execute(
          `INSERT INTO vehiculos (conductor_id, placa, marca, modelo, anio, color, es_activo)
           VALUES (?, ?, ?, ?, ?, ?, true)`,
          [conductor.insertId, dto.vehiculo.placa, dto.vehiculo.marca, dto.vehiculo.modelo, new Date().getFullYear(), dto.vehiculo.color],
        );
      }
      const nameParts = dto.nombre_completo.trim().split(/\s+/);
      const nombre = nameParts[0];
      const apellidoValue = nameParts.slice(1).join(' ');
      const apellido = apellidoValue.length === 0 ? 'Conductor' : apellidoValue;
      await connection.execute(
        `INSERT INTO usuario_chofer (
          nombre, apellido, celular, usuario, password, rol, numero_carnet,
          licencia_conducir, foto_perfil, estado, estado_disponibilidad
        ) VALUES (?, ?, ?, ?, ?, 'CONDUCTOR', ?, ?, ?, 'activo', 'offline')`,
        [
          nombre,
          apellido,
          dto.celular,
          dto.usuario,
          await this.authService.hashPassword(dto.password),
          dto.numero_carnet,
          dto.numero_licencia,
          dto.foto_perfil ?? null,
        ],
      );
      return conductor.insertId;
    });
    return this.findProfileById(id);
  }

  async findProfileByCellphone(celular: string) {
    const rows = await this.database.query<any[]>(
      `SELECT c.id, c.nombre, c.dni_ci, c.telefono, c.licencia, c.foto_perfil, c.estado_global,
              v.id vehiculo_id, v.placa, v.marca, v.modelo, v.color
       FROM conductor c
       LEFT JOIN vehiculos v ON v.conductor_id = c.id AND v.es_activo = true
       WHERE c.telefono = ? ORDER BY v.id DESC LIMIT 1`,
      [celular],
    );
    if (!rows[0]) return null;
    return this.toProfile(rows[0]);
  }

  async findProfileById(id: number) {
    const rows = await this.database.query<any[]>(
      `SELECT c.id, c.nombre, c.dni_ci, c.telefono, c.licencia, c.foto_perfil, c.estado_global,
              v.id vehiculo_id, v.placa, v.marca, v.modelo, v.color
       FROM conductor c
       LEFT JOIN vehiculos v ON v.conductor_id = c.id AND v.es_activo = true
       WHERE c.id = ? ORDER BY v.id DESC LIMIT 1`,
      [id],
    );
    return this.toProfile(rows[0]);
  }

  async listProfiles() {
    const rows = await this.database.query<any[]>(
      `SELECT c.id,
              COALESCE(c.nombre_completo, c.nombre) nombre_completo,
              COALESCE(c.numero_carnet, c.dni_ci) numero_carnet,
              COALESCE(c.celular, c.telefono) celular,
              COALESCE(c.numero_licencia, c.licencia) numero_licencia,
              c.foto_perfil, c.estado_global, u.usuario, v.placa
       FROM conductor c
       LEFT JOIN usuario_chofer u ON
         CONVERT(u.celular USING utf8mb4) COLLATE utf8mb4_unicode_ci =
         CONVERT(COALESCE(c.celular, c.telefono) USING utf8mb4) COLLATE utf8mb4_unicode_ci
       LEFT JOIN vehiculos v ON v.conductor_id = c.id AND v.es_activo = true
       ORDER BY c.id DESC, v.id DESC`,
    );
    const seen = new Set<number>();
    const data = rows.filter((row) => !seen.has(Number(row.id)) && !!seen.add(Number(row.id))).map((row) => ({
      id: Number(row.id),
      nombre_completo: row.nombre_completo,
      numero_carnet: row.numero_carnet,
      celular: row.celular,
      numero_licencia: row.numero_licencia,
      foto_perfil: row.foto_perfil,
      usuario: row.usuario,
      estado: row.estado_global === 'activo' ? 'APROBADO' : 'PENDIENTE',
      vehiculo: row.placa ? { placa: row.placa } : null,
    }));
    return { data, total: data.length };
  }

  async updateProfile(id: number, dto: UpdateDriverProfileDto) {
    await this.database.transaction(async (connection) => {
      const [[current]] = await connection.query<any[]>(
        'SELECT nombre, dni_ci, telefono, licencia, foto_perfil FROM conductor WHERE id = ? LIMIT 1',
        [id],
      );
      if (!current) throw new UnprocessableEntityException({ errors: { id: ['Conductor no encontrado'] } });
      const fullName = dto.nombre_completo ?? current.nombre;
      const carnet = dto.numero_carnet ?? current.dni_ci;
      const cellphone = dto.celular ?? current.telefono;
      const license = dto.numero_licencia ?? current.licencia;
      const photo = dto.foto_perfil ?? current.foto_perfil;
      const parts = String(fullName).trim().split(/\s+/);
      const firstName = parts[0];
      const lastNameValue = parts.slice(1).join(' ');
      const lastName = lastNameValue.length === 0 ? 'Conductor' : lastNameValue;
      await connection.execute(
        `UPDATE conductor SET
          nombre = ?, nombre_completo = ?, dni_ci = ?, numero_carnet = ?,
          telefono = ?, celular = ?, licencia = ?, numero_licencia = ?, foto_perfil = ?
         WHERE id = ?`,
        [fullName, fullName, carnet, carnet, cellphone, cellphone, license, license, photo, id],
      );
      const values: any[] = [firstName, lastName, cellphone, carnet, license, photo];
      let sql = `UPDATE usuario_chofer SET nombre = ?, apellido = ?, celular = ?, numero_carnet = ?, licencia_conducir = ?, foto_perfil = ?`;
      if (dto.usuario) { sql += ', usuario = ?'; values.push(dto.usuario); }
      if (dto.password) { sql += ', password = ?'; values.push(await this.authService.hashPassword(dto.password)); }
      sql += ' WHERE celular = ?';
      values.push(current.telefono);
      const [updatedAccount] = await connection.execute<ResultSetHeader>(sql, values);
      if (updatedAccount.affectedRows === 0) {
        if (!dto.usuario || !dto.password) {
          throw new UnprocessableEntityException({
            errors: { usuario: ['Ingresa usuario y contraseña para crear la cuenta del conductor'] },
          });
        }
        await connection.execute(
          `INSERT INTO usuario_chofer (
            nombre, apellido, celular, usuario, password, rol, numero_carnet,
            licencia_conducir, foto_perfil, estado, estado_disponibilidad
          ) VALUES (?, ?, ?, ?, ?, 'CONDUCTOR', ?, ?, ?, 'activo', 'offline')`,
          [
            firstName,
            lastName,
            cellphone,
            dto.usuario,
            await this.authService.hashPassword(dto.password),
            carnet,
            license,
            photo,
          ],
        );
      }
    });
    return this.findProfileById(id);
  }

  async updateLocation(celular: string, latitud: number, longitud: number) {
    const profile = await this.findProfileByCellphone(celular);
    if (!profile) return null;
    await this.database.execute(
      'INSERT INTO ubicaciones_conductor (conductor_id, latitud, longitud) VALUES (?, ?, ?)',
      [profile.id, latitud, longitud],
    );
    return { success: true, conductor_id: profile.id, latitud, longitud };
  }

  async setAvailability(celular: string, online: boolean) {
    await this.database.execute(
      'UPDATE usuario_chofer SET estado_disponibilidad = ? WHERE celular = ?',
      [online ? 'online' : 'offline', celular],
    );
    return { online };
  }

  async createTripRequest(input: any) {
    const result = await this.database.execute(
      `INSERT INTO viajes_despacho (pasajero_nombre, origen_nombre, origen_latitud, origen_longitud, destino_nombre, destino_latitud, destino_longitud, monto, metodo_pago)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.pasajero_nombre ?? 'Pasajero VILLANGO', input.origen_nombre, input.origen_latitud, input.origen_longitud, input.destino_nombre, input.destino_latitud, input.destino_longitud, input.monto, input.metodo_pago ?? null],
    );
    return { id: result.insertId, estado: 'pendiente' };
  }

  async pendingTripRequests(celular: string) {
    const profile = await this.findProfileByCellphone(celular);
    if (!profile) return [];
    const online = await this.database.query<any[]>(
      "SELECT id FROM usuario_chofer WHERE celular = ? AND estado_disponibilidad = 'online' LIMIT 1", [celular],
    );
    if (!online[0]) return [];
    return this.database.query<any[]>(
      `SELECT id, pasajero_nombre, origen_nombre, origen_latitud, origen_longitud, destino_nombre, destino_latitud, destino_longitud, monto, metodo_pago, created_at
       FROM viajes_despacho WHERE estado = 'pendiente' ORDER BY created_at DESC`,
    );
  }

  async acceptTripRequest(id: number, celular: string) {
    const profile = await this.findProfileByCellphone(celular);
    if (!profile) throw new UnprocessableEntityException('Perfil de conductor no encontrado.');
    return this.database.transaction(async (connection) => {
      const [result] = await connection.execute<ResultSetHeader>(
        "UPDATE viajes_despacho SET estado = 'aceptado', conductor_id = ?, accepted_at = NOW() WHERE id = ? AND estado = 'pendiente'",
        [profile.id, id],
      );
      if (result.affectedRows === 0) throw new UnprocessableEntityException('Este viaje ya fue aceptado por otro conductor.');
      await connection.execute("UPDATE usuario_chofer SET estado_disponibilidad = 'ocupado' WHERE celular = ?", [celular]);
      return { id, estado: 'aceptado', conductor_id: profile.id };
    });
  }

  async nearbyDrivers() {
    return this.database.query<any[]>(
      `SELECT c.id, c.nombre nombre_completo, u.latitud, u.longitud, u.created_at
       FROM conductor c
       JOIN ubicaciones_conductor u ON u.id = (
         SELECT latest.id FROM ubicaciones_conductor latest
         WHERE latest.conductor_id = c.id ORDER BY latest.id DESC LIMIT 1
       )
       WHERE c.estado_global = 'activo'`,
    );
  }

  private toProfile(row: any) {
    return {
      id: Number(row.id),
      nombre_completo: row.nombre,
      numero_carnet: row.dni_ci,
      celular: row.telefono,
      numero_licencia: row.licencia,
      foto_perfil: row.foto_perfil,
      estado: row.estado_global === 'activo' ? 'APROBADO' : 'PENDIENTE',
      vehiculo: row.vehiculo_id ? {
        id: Number(row.vehiculo_id), placa: row.placa, marca: row.marca,
        modelo: row.modelo, color: row.color,
      } : null,
    };
  }
}
