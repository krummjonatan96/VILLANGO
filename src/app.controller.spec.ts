import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
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
