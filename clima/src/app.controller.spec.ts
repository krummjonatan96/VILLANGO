import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: HttpService, useValue: {} }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('info', () => {
    it('should expose the API endpoints', () => {
      expect(appController.getInfo()).toEqual(
        expect.objectContaining({ name: 'clima-api' }),
      );
    });
  });
});
