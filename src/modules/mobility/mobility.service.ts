import { Injectable } from '@nestjs/common';
import { BaseService } from '../../common/base.service.js';
import {
  CalificacionesRepository, ConductoresRepository, DocumentosRepository, SolicitudesViajeConductorRepository,
  TiposDocumentoRepository, UbicacionesConductorRepository, UbicacionesViajeRepository, VehiculosRepository, ViajesRepository,
} from './mobility.repository.js';

@Injectable() export class ConductoresService extends BaseService { constructor(repository: ConductoresRepository) { super(repository); } }
@Injectable() export class VehiculosService extends BaseService { constructor(repository: VehiculosRepository) { super(repository); } }
@Injectable() export class TiposDocumentoService extends BaseService { constructor(repository: TiposDocumentoRepository) { super(repository); } }
@Injectable() export class DocumentosService extends BaseService { constructor(repository: DocumentosRepository) { super(repository); } }
@Injectable() export class UbicacionesConductorService extends BaseService { constructor(repository: UbicacionesConductorRepository) { super(repository); } }
@Injectable() export class UbicacionesViajeService extends BaseService { constructor(repository: UbicacionesViajeRepository) { super(repository); } }
@Injectable() export class ViajesService extends BaseService { constructor(repository: ViajesRepository) { super(repository); } }
@Injectable() export class SolicitudesViajeConductorService extends BaseService { constructor(repository: SolicitudesViajeConductorRepository) { super(repository); } }
@Injectable() export class CalificacionesService extends BaseService { constructor(repository: CalificacionesRepository) { super(repository); } }
