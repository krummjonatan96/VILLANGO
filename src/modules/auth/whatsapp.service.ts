import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WhatsAppService {
  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  async sendAuthenticationOtp(phone: string, code: string) {
    const token = this.required('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = this.required('WHATSAPP_PHONE_NUMBER_ID');
    const template = this.required('WHATSAPP_OTP_TEMPLATE');
    const version = this.required('WHATSAPP_API_VERSION');
    const language = this.config.get<string>('WHATSAPP_OTP_TEMPLATE_LANGUAGE', 'es');

    try {
      await firstValueFrom(this.http.post(
        `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'template',
          template: {
            name: template,
            language: { code: language },
            // Authentication templates with Copy Code use an OTP button, which
            // is sent through the template message endpoint as URL button 0.
            components: [{
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{ type: 'text', text: code }],
            }],
          },
        },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10_000 },
      ));
    } catch {
      // Do not leak Graph API details or configuration to the client.
      throw new ServiceUnavailableException('No fue posible enviar el código. Intenta nuevamente.');
    }
  }

  private required(name: string) {
    const value = this.config.get<string>(name)?.trim();
    if (!value) throw new ServiceUnavailableException('El servicio de verificación no está disponible.');
    return value;
  }
}
