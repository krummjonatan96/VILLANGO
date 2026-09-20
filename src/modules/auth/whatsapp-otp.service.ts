import { BadRequestException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, randomInt, scrypt as rawScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { WhatsAppService } from './whatsapp.service.js';
import { WhatsAppOtpRepository } from './whatsapp-otp.repository.js';

const scrypt = promisify(rawScrypt);

@Injectable()
export class WhatsAppOtpService {
  constructor(
    private readonly otps: WhatsAppOtpRepository,
    private readonly whatsapp: WhatsAppService,
  ) {}

  async request(phoneInput: string) {
    const phone = this.normalizeBolivianPhone(phoneInput);
    const latest = await this.otps.latestForPhone(phone);
    if (Number(latest?.recent ?? 0) === 1) {
      throw new HttpException('Espera un minuto antes de solicitar otro código.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (await this.otps.sentInLast15Minutes(phone) >= 5) {
      throw new HttpException('Demasiadas solicitudes. Intenta más tarde.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = randomInt(100000, 1000000).toString();
    const created = await this.otps.create(phone, await this.hash(code));
    const id = this.otps.insertId(created);
    try {
      await this.whatsapp.sendAuthenticationOtp(phone, code);
      await this.otps.markSent(id);
    } catch (error) {
      await this.otps.invalidate(id);
      throw error;
    }
    return { success: true, message: 'Código enviado por WhatsApp.', data: { expiresInSeconds: 300, resendAfterSeconds: 60 } };
  }

  async verify(phoneInput: string, code: string) {
    const phone = this.normalizeBolivianPhone(phoneInput);
    const otp = await this.otps.latestActive(phone);
    if (!otp || Number(otp.is_unexpired ?? 0) !== 1 || Number(otp.attempts ?? 0) >= 5) {
      if (otp) await this.otps.invalidate(Number(otp.id));
      throw new UnauthorizedException('El código es inválido o expiró.');
    }

    if (!(await this.matches(code, String(otp.otp_hash)))) {
      const attempts = Number(otp.attempts) + 1;
      await this.otps.incrementAttempts(Number(otp.id));
      if (attempts >= 5) await this.otps.invalidate(Number(otp.id));
      throw new UnauthorizedException('El código es inválido o expiró.');
    }

    await this.otps.verify(Number(otp.id));
    return { success: true, message: 'Número verificado.', data: { phone, verified: true } };
  }

  private normalizeBolivianPhone(value: string) {
    const digits = value.replace(/\D/g, '');
    const normalized = /^([67]\d{7})$/.test(digits) ? `591${digits}` : digits;
    if (!/^591[67]\d{7}$/.test(normalized)) {
      throw new BadRequestException('Número de celular inválido.');
    }
    return normalized;
  }

  private async hash(value: string) {
    const salt = randomBytes(16).toString('hex');
    const key = await scrypt(value, salt, 64) as Buffer;
    return `scrypt$${salt}$${key.toString('hex')}`;
  }

  private async matches(value: string, encoded: string) {
    const [, salt, hash] = encoded.split('$');
    if (!salt || !hash) return false;
    const key = await scrypt(value, salt, 64) as Buffer;
    const expected = Buffer.from(hash, 'hex');
    return expected.length === key.length && timingSafeEqual(expected, key);
  }
}
