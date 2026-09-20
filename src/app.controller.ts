import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class AppController {
  @Get()
  getInfo() {
    return {
      name: 'clima-api',
      architecture: 'controllers-services-repositories',
      endpoints: [
        'GET|POST /api/locations',
        'GET /api/weather',
        'GET /api/database/status',
        'CRUD /api/usuarios (alias anterior)',
        'POST /api/conductores/registro (registro de conductor)',
        'POST /api/auth/register',
        'POST /api/auth/login',
        'POST /api/auth/whatsapp-otp/request',
        'POST /api/auth/whatsapp-otp/verify',
        'POST /api/auth/logout',
        'GET /api/auth/me',
        'CRUD /api/conductores',
        'CRUD /api/vehiculos',
        'CRUD /api/tipos-documento',
        'CRUD /api/documentos',
        'CRUD /api/ubicaciones-conductor',
        'CRUD /api/ubicaciones-viaje',
        'CRUD /api/viajes',
        'CRUD /api/solicitudes-viaje-conductor',
        'CRUD /api/calificaciones',
      ],
    };
  }
}
