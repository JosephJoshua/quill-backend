import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BlobServiceClient } from '@azure/storage-blob';
import { SearchClient, AzureKeyCredential } from '@azure/search-documents';

export const AZURE_BLOB_SERVICE_CLIENT = 'AZURE_BLOB_SERVICE_CLIENT';
export const AZURE_SEARCH_CLIENT = 'AZURE_SEARCH_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: AZURE_BLOB_SERVICE_CLIENT,
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.get<string>(
          'azure.storage.connectionString',
        );

        if (connectionString == null) {
          throw new Error(
            'Azure Storage connection string is missing in configuration',
          );
        }

        return BlobServiceClient.fromConnectionString(connectionString);
      },
      inject: [ConfigService],
    },
    {
      provide: AZURE_SEARCH_CLIENT,
      useFactory: (configService: ConfigService) => {
        const endpoint = configService.get<string>('azure.search.endpoint');
        const key = configService.get<string>('azure.search.key');
        const indexName = configService.get<string>('azure.search.indexName');

        if (!endpoint || !key || !indexName) {
          throw new Error(
            'Azure Search endpoint, key, or index name missing in configuration',
          );
        }

        return new SearchClient(
          endpoint,
          indexName,
          new AzureKeyCredential(key),
        );
      },
      inject: [ConfigService],
    },
  ],
  exports: [AZURE_BLOB_SERVICE_CLIENT, AZURE_SEARCH_CLIENT],
})
export class AzureModule {}
