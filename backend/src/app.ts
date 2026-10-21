import 'reflect-metadata';
import { Module, type DynamicModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import swaggerUi from 'swagger-ui-express';
import { AccessService } from './auth/access.js';
import { AuthController } from './auth/auth.controller.js';
import { AttemptLimiter } from './auth/limiter.js';
import { SessionGuard, SessionService } from './auth/session.js';
import type { Config } from './config.js';
import { CoreModule } from './core.js';
import type { Db } from './db/db.js';
import { Contract } from './http/contract.js';
import { ApiExceptionFilter } from './http/exception.filter.js';
import { cors, jsonBody, originAndContentType, requestId } from './http/middleware.js';
import { ProjectsController } from './projects/projects.controller.js';
import { MODULE_CONTROLLERS, MODULE_PROVIDERS } from './registry.js';

@Module({})
class AppModule {
  static register(config: Config, db: Db, contract: Contract, limiter: AttemptLimiter): DynamicModule {
    return {
      module: AppModule,
      imports: [CoreModule.register(config, db, contract)],
      controllers: [AuthController, ProjectsController, ...MODULE_CONTROLLERS],
      providers: [
        SessionService,
        AccessService,
        ...MODULE_PROVIDERS,
        { provide: AttemptLimiter, useValue: limiter },
        { provide: APP_GUARD, useClass: SessionGuard },
        { provide: APP_FILTER, useClass: ApiExceptionFilter },
      ],
    };
  }
}

export interface AppHandle {
  app: NestExpressApplication;
  contract: Contract;
  limiter: AttemptLimiter;
}

export async function createApp(config: Config, db: Db): Promise<AppHandle> {
  const contract = new Contract(config.openapiPath);
  const limiter = new AttemptLimiter();
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(config, db, contract, limiter), {
    bodyParser: false,
    logger: config.env === 'test' ? false : ['error', 'warn', 'log'],
  });
  // За nginx: настоящий IP клиента берём из X-Forwarded-For от доверенных прокси
  app.set('trust proxy', 'loopback, uniquelocal');
  app.disable('x-powered-by');
  app.use(requestId);
  app.use(cors(config));
  if (config.docs) {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(contract.doc, { customSiteTitle: 'Task manager API (MVP)' }));
  }
  app.use('/api', originAndContentType(config));
  app.use('/api', jsonBody());
  app.setGlobalPrefix('api');
  await app.init();
  return { app, contract, limiter };
}
