import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api (GET)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBe('clima-api');
      });
  });

  it('/api/locations (POST and GET)', async () => {
    await request(app.getHttpServer())
      .post('/api/locations')
      .send({ name: 'Bogota', latitude: 4.711, longitude: -74.0721 })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({
          id: 1,
          name: 'Bogota',
          latitude: 4.711,
          longitude: -74.0721,
        });
      });

    return request(app.getHttpServer())
      .get('/api/locations')
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(1));
  });

  afterEach(async () => {
    await app.close();
  });
});
