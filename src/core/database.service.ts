import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mysql, { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

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
      await this.ensureAuthTables();
      await this.ensureWhatsAppOtpTables();
      await this.ensureDriverUserTables();
      await this.ensureDriverProfileSchema();
      await this.ensureTripDispatchSchema();
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

  private async ensureAuthTables() {
    await this.pool?.execute(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        celular VARCHAR(30) NOT NULL UNIQUE,
        empresa VARCHAR(150) NULL,
        numero_carnet VARCHAR(50) NULL UNIQUE,
        password VARCHAR(255) NULL,
        rol VARCHAR(30) NOT NULL DEFAULT 'PASAJERO',
        estado VARCHAR(30) NOT NULL DEFAULT 'activo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool?.execute(`
      CREATE TABLE IF NOT EXISTS api_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        expira_en DATETIME NULL,
        ultimo_uso DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_api_tokens_usuario
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  private async ensureDriverUserTables() {
    const [legacyTables] = await this.pool!.query("SHOW TABLES LIKE 'uauarios_chofer'");
    const [correctTables] = await this.pool!.query("SHOW TABLES LIKE 'usuario_chofer'");
    if ((legacyTables as unknown[]).length > 0 && (correctTables as unknown[]).length === 0) {
      await this.pool!.query('RENAME TABLE uauarios_chofer TO usuario_chofer');
    }
    await this.pool?.execute(`
      CREATE TABLE IF NOT EXISTS usuario_chofer (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        celular VARCHAR(30) NOT NULL UNIQUE,
        usuario VARCHAR(80) NULL UNIQUE,
        email VARCHAR(150) NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        rol VARCHAR(20) NOT NULL DEFAULT 'CONDUCTOR',
        numero_carnet VARCHAR(50) NOT NULL UNIQUE,
        licencia_conducir VARCHAR(80) NOT NULL UNIQUE,
        fecha_vencimiento_licencia DATE NULL,
        foto_perfil VARCHAR(500) NULL,
        estado ENUM('pendiente', 'en_revision', 'activo', 'suspendido', 'bloqueado') NOT NULL DEFAULT 'pendiente',
        estado_disponibilidad ENUM('offline', 'online', 'ocupado') NOT NULL DEFAULT 'offline',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool?.execute(
      "ALTER TABLE usuario_chofer ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'CONDUCTOR'",
    );
    await this.pool?.execute(
      'ALTER TABLE usuario_chofer ADD COLUMN IF NOT EXISTS usuario VARCHAR(80) NULL',
    );
    await this.pool?.execute(
      'CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_chofer_usuario ON usuario_chofer (usuario)',
    );

    await this.pool?.execute(`
      CREATE TABLE IF NOT EXISTS api_tokens_chofer (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chofer_id INT NOT NULL,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        expira_en DATETIME NULL,
        ultimo_uso DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_api_tokens_chofer_usuario
          FOREIGN KEY (chofer_id) REFERENCES usuario_chofer(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  private async ensureWhatsAppOtpTables() {
    await this.pool?.execute(`
      CREATE TABLE IF NOT EXISTS whatsapp_otps (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        otp_hash VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
        verified_at DATETIME NULL,
        invalidated_at DATETIME NULL,
        sent_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX ix_whatsapp_otps_phone_created (phone, created_at),
        INDEX ix_whatsapp_otps_phone_active (phone, verified_at, invalidated_at, expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  private async ensureDriverProfileSchema() {
    await this.pool?.execute(
      'ALTER TABLE conductor ADD COLUMN IF NOT EXISTS licencia VARCHAR(80) NULL',
    );
    await this.pool?.execute(`
      ALTER TABLE conductor
        ADD COLUMN IF NOT EXISTS nombre_completo VARCHAR(150) NULL,
        ADD COLUMN IF NOT EXISTS numero_carnet VARCHAR(30) NULL,
        ADD COLUMN IF NOT EXISTS celular VARCHAR(20) NULL,
        ADD COLUMN IF NOT EXISTS numero_licencia VARCHAR(50) NULL,
        ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NULL
    `);
    await this.pool?.execute(`
      UPDATE conductor
      SET nombre_completo = COALESCE(nombre_completo, nombre),
          numero_carnet = COALESCE(numero_carnet, dni_ci),
          celular = COALESCE(celular, telefono),
          numero_licencia = COALESCE(numero_licencia, licencia),
          estado = COALESCE(estado, IF(estado_global = 'activo', 'APROBADO', 'PENDIENTE'))
    `);
    await this.pool?.execute('CREATE UNIQUE INDEX IF NOT EXISTS ux_conductor_numero_carnet ON conductor (numero_carnet)');
    await this.pool?.execute('CREATE UNIQUE INDEX IF NOT EXISTS ux_conductor_celular ON conductor (celular)');
    await this.pool?.execute('CREATE UNIQUE INDEX IF NOT EXISTS ux_conductor_numero_licencia ON conductor (numero_licencia)');
    await this.pool?.execute(`
      ALTER TABLE vehiculos
        ADD COLUMN IF NOT EXISTS numero_chasis VARCHAR(80) NULL,
        ADD COLUMN IF NOT EXISTS numero_ruat VARCHAR(80) NULL,
        ADD COLUMN IF NOT EXISTS foto_url VARCHAR(500) NULL
    `);
  }

  private async ensureTripDispatchSchema() {
    await this.pool?.execute(`
      CREATE TABLE IF NOT EXISTS viajes_despacho (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        pasajero_nombre VARCHAR(150) NOT NULL,
        origen_nombre VARCHAR(180) NOT NULL,
        origen_latitud DECIMAL(10,7) NOT NULL,
        origen_longitud DECIMAL(10,7) NOT NULL,
        destino_nombre VARCHAR(180) NOT NULL,
        destino_latitud DECIMAL(10,7) NOT NULL,
        destino_longitud DECIMAL(10,7) NOT NULL,
        monto DECIMAL(10,2) NOT NULL,
        metodo_pago VARCHAR(30) NULL,
        estado ENUM('pendiente','aceptado','cancelado') NOT NULL DEFAULT 'pendiente',
        conductor_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accepted_at DATETIME NULL,
        INDEX ix_viajes_despacho_estado (estado, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  getStatus() {
    return {
      connected: this.connected,
      database: this.configService.get<string>('DB_NAME') ?? null,
      host: this.configService.get<string>('DB_HOST') ?? null,
    };
  }

  async query<T extends RowDataPacket[]>(sql: string, values: any[] = []) {
    const [rows] = await this.getPool().execute<T>(sql, values);
    return rows;
  }

  async execute(sql: string, values: any[] = []) {
    try {
      const [result] = await this.getPool().execute<ResultSetHeader>(sql, values);
      return result;
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async transaction<T>(work: (connection: PoolConnection) => Promise<T>) {
    const connection = await this.getPool().getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
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
