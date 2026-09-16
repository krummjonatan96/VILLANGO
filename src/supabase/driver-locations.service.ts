import { BadGatewayException, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { SupabaseService, type VillangoRealtimeEvent } from './supabase.service.js';
import { UpdateDriverLocationDto } from './dto/update-driver-location.dto.js';

type DriverLocationRow = {
  id: number;
  id_conductor?: string;
  conductor_id?: string;
  latitud: number;
  longitud: number;
  estado: number | null;
  ultima_hora: string;
};

export type DriverMapLocation = {
  id: number;
  driverId: string;
  latitude: number;
  longitude: number;
  status: number | null;
  updatedAt: string;
};

@Injectable()
export class DriverLocationsService {
  private static readonly table = 'conductor_ubicacion';

  constructor(private readonly supabase: SupabaseService) {}

  /** Posiciones recientes, una sola ubicaci\u00f3n (la m\u00e1s nueva) por conductor. */
  async findCurrent(maxAgeMinutes = 10, limit = 500): Promise<DriverMapLocation[]> {
    // ultima_hora es `timestamp` (sin zona horaria) en Supabase. No usar
    // toISOString(), que convierte a UTC y descarta ubicaciones locales v\u00e1lidas.
    const after = this.toLocalDatabaseTimestamp(new Date(Date.now() - maxAgeMinutes * 60_000));
    const { data, error } = await this.supabase
      .getClient()
      .from(DriverLocationsService.table)
      // select('*') permite convivir con los dos nombres usados en el
      // proyecto: id_conductor (Supabase) y conductor_id (esquema previo).
      .select('*')
      .gte('ultima_hora', after)
      .order('ultima_hora', { ascending: false })
      .limit(limit);

    if (error) throw new BadGatewayException(`No se pudieron obtener ubicaciones: ${error.message}`);

    const latestByDriver = new Map<string, DriverMapLocation>();
    for (const row of (data ?? []) as DriverLocationRow[]) {
      const location = this.toMapLocation(row);
      if (location && !latestByDriver.has(location.driverId)) latestByDriver.set(location.driverId, location);
    }
    return [...latestByDriver.values()];
  }

  /** Inserta la primera posición o actualiza la posición vigente del conductor. */
  async saveDriverLocation(input: UpdateDriverLocationDto): Promise<DriverMapLocation> {
    const payload = {
      conductor_id: input.conductorId,
      latitud: input.latitude,
      longitud: input.longitude,
      estado: input.status ?? 1, // 1 = activo (verde), 2 = inactivo (rojo)
      ultima_hora: this.toLocalDatabaseTimestamp(new Date()),
    };
    const client = this.supabase.getClient();
    const { data: current, error: currentError } = await client
      .from(DriverLocationsService.table)
      .select('id')
      .eq('conductor_id', input.conductorId)
      .order('id', { ascending: false })
      .limit(1);
    if (currentError) throw new BadGatewayException(`No se pudo buscar la ubicación: ${currentError.message}`);

    const query = current != null && current.length > 0
      ? client.from(DriverLocationsService.table).update(payload).eq('id', current[0].id).select().single()
      : client.from(DriverLocationsService.table).insert(payload).select().single();
    const { data, error } = await query;
    if (error) throw new BadGatewayException(`No se pudo guardar la ubicación: ${error.message}`);
    const location = this.toMapLocation(data as DriverLocationRow);
    if (!location) throw new BadGatewayException('Supabase devolvió una ubicación inválida.');
    return location;
  }

  /**
   * Stream SSE: el primer mensaje contiene el listado actual y los siguientes
   * son inserciones, actualizaciones o eliminaciones de Supabase Realtime.
   */
  stream(maxAgeMinutes: number): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      void this.findCurrent(maxAgeMinutes)
        .then((locations) => subscriber.next({ type: 'snapshot', data: { locations } }))
        .catch((error: unknown) => subscriber.error(error));

      const unsubscribe = this.supabase.onTableChange(DriverLocationsService.table, (event) => {
        const message = this.toStreamMessage(event);
        if (message) subscriber.next(message);
      });

      // Evita que navegadores, proxies o balanceadores cierren un SSE inactivo.
      const heartbeat = setInterval(() => {
        subscriber.next({ type: 'heartbeat', data: { at: new Date().toISOString() } });
      }, 25_000);

      return () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    });
  }

  private toStreamMessage(event: VillangoRealtimeEvent): MessageEvent | null {
    const row = (event.eventType === 'DELETE' ? event.old : event.new) as Partial<DriverLocationRow>;
    if (!this.driverId(row)) return null;

    if (event.eventType === 'DELETE') {
      return { type: 'delete', data: { driverId: this.driverId(row)! } };
    }

    const location = this.toMapLocation(row);
    return location ? { type: event.eventType.toLowerCase(), data: location } : null;
  }

  private toMapLocation(row: Partial<DriverLocationRow>): DriverMapLocation | null {
    const latitude = Number(row.latitud);
    const longitude = Number(row.longitud);
    const driverId = this.driverId(row);
    if (!row.id || !driverId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

    return {
      id: Number(row.id),
      driverId,
      latitude,
      longitude,
      status: row.estado == null ? null : Number(row.estado),
      updatedAt: row.ultima_hora ?? new Date().toISOString(),
    };
  }

  private driverId(row: Partial<DriverLocationRow>): string | null {
    const value = row.id_conductor ?? row.conductor_id;
    return value == null || value === '' ? null : String(value);
  }

  private toLocalDatabaseTimestamp(date: Date): string {
    const part = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}`
      + `T${part(date.getHours())}:${part(date.getMinutes())}:${part(date.getSeconds())}`;
  }
}
