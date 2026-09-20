import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RequestWhatsAppOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9\s()-]{8,20}$/)
  phone!: string;
}

export class VerifyWhatsAppOtpDto extends RequestWhatsAppOtpDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
