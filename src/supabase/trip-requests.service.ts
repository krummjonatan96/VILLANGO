import { BadGatewayException, ConflictException, Injectable } from '@nestjs/common';
import { SupabaseService } from './supabase.service.js';

type TripRequestInput = {
  pasajero_nombre?: string;
  origen_nombre: string;
  origen_latitud: number;
  origen_longitud: number;
  destino_nombre: string;
  destino_latitud: number;
  destino_longitud: number;
  monto: number;
  metodo_pago?: string;
  tipo_servicio?: string;
};

/** Cola de solicitudes Cliente -> Chofer almacenada en Supabase. */
@Injectable()
export class TripRequestsService {
  private static readonly table = 'solicitudes_viaje_conductor';

  constructor(private readonly supabase: SupabaseService) {}

  async create(input: TripRequestInput) {
    const payload = {
      pasajero_nombre: String(input.pasajero_nombre ?? 'Pasajero VILLANGO').trim() || 'Pasajero VILLANGO',
      origen_nombre: this.requiredText(input.origen_nombre, 'origen_nombre'),
      origen_latitud: this.coordinate(input.origen_latitud, -90, 90, 'origen_latitud'),
      origen_longitud: this.coordinate(input.origen_longitud, -180, 180, 'origen_longitud'),
      destino_nombre: this.requiredText(input.destino_nombre, 'destino_nombre'),
      destino_latitud: this.coordinate(input.destino_latitud, -90, 90, 'destino_latitud'),
      destino_longitud: this.coordinate(input.destino_longitud, -180, 180, 'destino_longitud'),
      monto: this.positiveNumber(input.monto, 'monto'),
      metodo_pago: input.metodo_pago ? String(input.metodo_pago).trim() : null,
      tipo_servicio: input.tipo_servicio ? String(input.tipo_servicio).trim() : null,
      estado: 'pendiente',
    };
    const { data, error } = await this.supabase.getClient()
      .from(TripRequestsService.table)
      .insert(payload)
      .select()
      .single();
    if (error) throw new BadGatewayException(`No se pudo crear la solicitud: ${error.message}`);
    return data;
  }

  async pending() {
    const { data, error } = await this.supabase.getClient()
      .from(TripRequestsService.table)
      .select('*')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });
    if (error) throw new BadGatewayException(`No se pudieron obtener solicitudes: ${error.message}`);
    return data ?? [];
  }

  async find(id: number) {
    const { data, error } = await this.supabase.getClient()
      .from(TripRequestsService.table).select('*').eq('id', id).maybeSingle();
    if (error) throw new BadGatewayException(`No se pudo consultar el viaje: ${error.message}`);
    if (!data) throw new ConflictException('El viaje ya no existe.');
    return data;
  }

  /** La condición estado=pendiente evita que dos choferes acepten el mismo viaje. */
  async accept(id: number, conductorId: number, profile: Record<string, any> = {}) {
    const { data, error } = await this.supabase.getClient()
      .from(TripRequestsService.table)
      .update({
        conductor_id: conductorId, estado: 'aceptado', accepted_at: new Date().toISOString(),
        conductor_nombre: profile.nombre ?? profile.nombre_completo ?? profile.fullName ?? null,
        conductor_telefono: profile.celular ?? profile.telefono ?? null,
        conductor_vehiculo: profile.vehiculo ?? profile.vehiculo_descripcion ?? null,
      })
      .eq('id', id)
      .eq('estado', 'pendiente')
      .select()
      .maybeSingle();
    if (error) throw new BadGatewayException(`No se pudo aceptar la solicitud: ${error.message}`);
    if (!data) throw new ConflictException('Este viaje ya fue aceptado o ya no está disponible.');
    return data;
  }

  async setStatus(id: number, conductorId: number, estado: string) {
    if (!['conductor_llegando', 'en_curso', 'completado'].includes(estado)) {
      throw new ConflictException('Estado de viaje no válido.');
    }
    const now = new Date().toISOString();
    const update: Record<string, unknown> = { estado, updated_at: now };
    if (estado === 'en_curso') update.inicio_at = now;
    if (estado === 'completado') update.finalizado_at = now;
    const { data, error } = await this.supabase.getClient().from(TripRequestsService.table)
      .update(update).eq('id', id).eq('conductor_id', conductorId).select().maybeSingle();
    if (error) throw new BadGatewayException(`No se pudo actualizar el viaje: ${error.message}`);
    if (!data) throw new ConflictException('El viaje no pertenece a este conductor.');
    return data;
  }

  async reject(id: number, conductorId: number) {
    // Rechazar para un conductor no cancela el viaje globalmente: otro chofer puede aceptarlo.
    // El cliente conserva la solicitud pendiente hasta que expire o sea aceptada.
    return { id, conductor_id: conductorId, estado: 'rechazado_por_conductor' };
  }

  private requiredText(value: unknown, field: string): string {
    const text = String(value ?? '').trim();
    if (!text) throw new BadGatewayException(`${field} es obligatorio.`);
    return text;
  }

  private coordinate(value: unknown, min: number, max: number, field: string): number {
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max) {
      throw new BadGatewayException(`${field} no es válido.`);
    }
    return number;
  }

  private positiveNumber(value: unknown, field: string): number {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new BadGatewayException(`${field} no es válido.`);
    return number;
  }
}
