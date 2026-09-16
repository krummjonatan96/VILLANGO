import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../core/database.service.js';
import { BaseRepository } from '../../common/base.repository.js';

@Injectable()
export class ConductoresRepository extends BaseRepository {
  constructor(database: DatabaseService) { super(database, 'conductor', ['nombre', 'dni_ci', 'telefono', 'foto_perfil', 'estado_disponibilidad', 'estado_global', 'vehiculo_activo_id', 'prioridad_asignacion', 'calificacion_promedio', 'saldo_efectivo', 'saldo_ganancias']); }
}
@Injectable()
export class VehiculosRepository extends BaseRepository {
  constructor(database: DatabaseService) { super(database, 'vehiculos', ['conductor_id', 'placa', 'marca', 'modelo', 'anio', 'color', 'numero_chasis', 'numero_ruat', 'foto_url', 'es_activo']); }
}
@Injectable()
export class TiposDocumentoRepository extends BaseRepository {
  constructor(database: DatabaseService) { super(database, 'tipos_documento', ['nombre', 'es_obligatorio']); }
}
@Injectable()
export class DocumentosRepository extends BaseRepository {
  constructor(database: DatabaseService) { super(database, 'documentos', ['conductor_id', 'tipo_documento_id', 'url_archivo', 'fecha_vencimiento', 'estado', 'motivo_rechazo']); }
}
@Injectable()
export class UbicacionesConductorRepository extends BaseRepository {
  constructor(database: DatabaseService) { super(database, 'ubicaciones_conductor', ['conductor_id', 'latitud', 'longitud']); }
}
@Injectable()
export class UbicacionesViajeRepository extends BaseRepository {
  constructor(database: DatabaseService) { super(database, 'ubicaciones_viaje', ['viaje_id', 'tipo_ubicacion', 'direccion_texto', 'latitud', 'longitud']); }
}
@Injectable()
export class ViajesRepository extends BaseRepository {
  constructor(database: DatabaseService) { super(database, 'viajes', ['conductor_id', 'pasajero_id', 'estado', 'monto_total', 'comision_plataforma', 'ganancia_conductor', 'metodo_pago', 'fecha_aceptado', 'fecha_inicio', 'fecha_fin']); }
}
@Injectable()
export class SolicitudesViajeConductorRepository extends BaseRepository {
  constructor(database: DatabaseService) { super(database, 'solicitudes_viaje_conductor', ['viaje_id', 'conductor_id', 'estado']); }
}
@Injectable()
export class CalificacionesRepository extends BaseRepository {
  constructor(database: DatabaseService) { super(database, 'calificaciones', ['viaje_id', 'conductor_id', 'calificacion', 'comentario']); }
}
