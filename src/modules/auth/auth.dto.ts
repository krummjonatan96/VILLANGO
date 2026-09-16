import { IsNotEmpty, IsString, MinLength } from 'class-validator';
export class RegisterDto { @IsString() @IsNotEmpty() nombre!: string; @IsString() @IsNotEmpty() apellido!: string; @IsString() @IsNotEmpty() celular!: string; @IsString() @MinLength(4) password!: string; }
export class LoginDto { @IsString() @IsNotEmpty() usuario!: string; @IsString() @IsNotEmpty() password!: string; }
