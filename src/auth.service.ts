import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, scrypt as rawScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import mysql, { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { ConfigService } from '@nestjs/config';
import { RegisterDto, LoginDto } from './auth.dto.js';
const scrypt=promisify(rawScrypt);
@Injectable() export class AuthService {
 private readonly pool:any;
 constructor(config:ConfigService){this.pool=mysql.createPool({host:config.get('DB_HOST'),user:config.get('DB_USER'),password:config.get('DB_PASSWORD'),database:config.get('DB_NAME'),port:config.get('DB_PORT',3306),connectionLimit:5});}
 private async hash(p:string){const s=randomBytes(16).toString('hex');const k=await scrypt(p,s,64) as Buffer;return `scrypt$${s}$${k.toString('hex')}`;}
 private async verify(p:string,e:string){const[,s,h]=e.split('$');if(!s||!h)return false;const k=await scrypt(p,s,64) as Buffer;const x=Buffer.from(h,'hex');return x.length===k.length&&timingSafeEqual(x,k);}
 private user(r:any){const {password:_,...u}=r;return u;}
 async register(d:RegisterDto){try{const[r]=await this.pool.execute('INSERT INTO usuarios (nombre,apellido,celular,password,rol,estado) VALUES (?,?,?,?,\'PASAJERO\',\'activo\')',[d.nombre,d.apellido,d.celular,await this.hash(d.password)]);return this.issue((r as ResultSetHeader).insertId);}catch(e:any){if(e?.code==='ER_DUP_ENTRY')throw new ConflictException('El celular ya está registrado.');throw e;}}
 async login(d:LoginDto){const[r]=await this.pool.execute('SELECT * FROM usuarios WHERE celular=? LIMIT 1',[d.celular]);const rows=r as RowDataPacket[];if(!rows[0]||!(await this.verify(d.password,rows[0].password??'')))throw new UnauthorizedException('Celular o contraseña incorrectos.');if(rows[0].estado!=='activo')throw new UnauthorizedException('Usuario inactivo o bloqueado.');return this.issue(rows[0].id);}
 async issue(id:number){const[r]=await this.pool.execute('SELECT * FROM usuarios WHERE id=? LIMIT 1',[id]);const rows=r as RowDataPacket[];const token=randomBytes(32).toString('hex');await this.pool.execute('INSERT INTO api_tokens (usuario_id,token_hash,expira_en) VALUES (?,?,DATE_ADD(NOW(),INTERVAL 30 DAY))',[id,createHash('sha256').update(token).digest('hex')]);return{success:true,message:'Autenticación correcta',data:{token,user:this.user(rows[0])}};}
 async me(auth?:string){if(!auth?.startsWith('Bearer '))throw new UnauthorizedException('Token requerido.');const h=createHash('sha256').update(auth.slice(7)).digest('hex');const[r]=await this.pool.execute('SELECT u.*,t.id token_id FROM api_tokens t JOIN usuarios u ON u.id=t.usuario_id WHERE t.token_hash=? AND (t.expira_en IS NULL OR t.expira_en>NOW()) LIMIT 1',[h]);const rows=r as RowDataPacket[];if(!rows[0]||rows[0].estado!=='activo')throw new UnauthorizedException('Token inválido o expirado.');await this.pool.execute('UPDATE api_tokens SET ultimo_uso=NOW() WHERE id=?',[rows[0].token_id]);return{success:true,message:'Usuario autenticado',data:this.user(rows[0])};}
 async logout(auth?:string){if(auth?.startsWith('Bearer '))await this.pool.execute('DELETE FROM api_tokens WHERE token_hash=?',[createHash('sha256').update(auth.slice(7)).digest('hex')]);return{success:true,message:'Sesión cerrada',data:null};}
}
