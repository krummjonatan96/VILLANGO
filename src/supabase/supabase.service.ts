import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createClient,
  type RealtimeChannel,
  type RealtimePostgresChangesPayload,
  type SupabaseClient,
} from '@supabase/supabase-js';

export type VillangoRealtimeEvent = RealtimePostgresChangesPayload<Record<string, unknown>>;
export type VillangoRealtimeListener = (event: VillangoRealtimeEvent) => void;

/**
 * Conexi\u00f3n de servidor a Supabase y puente de eventos Postgres Realtime.
 *
 * SUPABASE_SECRET_KEY nunca debe llegar a Flutter: este servicio solo se usa
 * dentro del backend. Las tablas escuchadas se controlan con
 * SUPABASE_REALTIME_TABLES (separadas por comas).
 */
@Injectable()
export class SupabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly listeners = new Map<string, Set<VillangoRealtimeListener>>();
  private readonly channels: RealtimeChannel[] = [];
  private client?: SupabaseClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('SUPABASE_URL');
    const secretKey = this.config.get<string>('SUPABASE_SECRET_KEY');

    if (!url || !secretKey) {
      this.logger.warn('Supabase no est\u00e1 configurado. Defina SUPABASE_URL y SUPABASE_SECRET_KEY para habilitarlo.');
      return;
    }

    this.client = createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { params: { eventsPerSecond: 20 } },
    });

    this.subscribeConfiguredTables();
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase no est\u00e1 configurado. Revise SUPABASE_URL y SUPABASE_SECRET_KEY.');
    }
    return this.client;
  }

  /** Suscribe l\u00f3gica de negocio a INSERT, UPDATE y DELETE de una tabla. */
  onTableChange(table: string, listener: VillangoRealtimeListener): () => void {
    const tableListeners = this.listeners.get(table) ?? new Set<VillangoRealtimeListener>();
    tableListeners.add(listener);
    this.listeners.set(table, tableListeners);
    return () => tableListeners.delete(listener);
  }

  private subscribeConfiguredTables(): void {
    const tables = (this.config.get<string>('SUPABASE_REALTIME_TABLES') ?? '')
      .split(',')
      .map((table) => table.trim())
      .filter(Boolean);

    if (!tables.length) {
      this.logger.warn('Supabase conectado sin suscripciones Realtime. Configure SUPABASE_REALTIME_TABLES.');
      return;
    }

    for (const table of tables) {
      const channel = this.getClient()
        .channel(`villango:${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (event: VillangoRealtimeEvent) => this.dispatch(table, event),
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') this.logger.log(`Realtime activo para public.${table}`);
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.logger.error(`Realtime no pudo suscribirse a public.${table}: ${status}`);
          }
        });
      this.channels.push(channel);
    }
  }

  private dispatch(table: string, event: VillangoRealtimeEvent): void {
    this.logger.debug(`Realtime ${event.eventType} en public.${table}`);
    for (const listener of this.listeners.get(table) ?? []) listener(event);
    for (const listener of this.listeners.get('*') ?? []) listener(event);
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) return;
    await Promise.all(this.channels.map((channel) => this.client!.removeChannel(channel)));
  }
}
