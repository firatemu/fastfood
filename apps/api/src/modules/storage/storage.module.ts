import { Global, Module } from '@nestjs/common';

import { getAppConfig } from '../../bootstrap/app-config.js';

import { OBJECT_STORAGE } from './object-storage.port.js';
import { PublicMediaController } from './public-media.controller.js';
import { S3ObjectStorageAdapter } from './s3-object-storage.adapter.js';

@Global()
@Module({
  controllers: [PublicMediaController],
  providers: [
    {
      provide: OBJECT_STORAGE,
      useFactory: () => new S3ObjectStorageAdapter(getAppConfig()),
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
