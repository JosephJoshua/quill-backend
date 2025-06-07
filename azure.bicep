@description('The base name for all resources, e.g., "quill". Should be lowercase and unique.')
param projectName string

@description('The environment for the deployment, e.g., "dev", "stg", "prod".')
param environment string = 'dev'

@description('The Azure region where all resources will be deployed.')
param location string = resourceGroup().location

// --- Parameters for secrets and user-specific names ---
@description('The administrator login for the PostgreSQL server.')
param postgresAdminLogin string = 'jsph273'

@description('The administrator password for the PostgreSQL server. You will be prompted for this during deployment.')
@secure()
param postgresAdminPassword string

@description('The name of the database to be created.')
param databaseName string = 'quill_dev'

@description('The name of the Azure Storage container for literature files.')
param storageContainerName string = 'quill-literature'

@description('The name of the Azure AI Search index.')
param searchIndexName string = 'quill-content-index'

@description('Your secret key for the JWT.')
@secure()
param jwtSecret string

@description('Your API key for OpenRouter.ai.')
@secure()
param openRouterApiKey string

var resourceToken = '${projectName}${environment}'
var tags = { project: projectName, environment: environment }

// Resource Names
var logAnalyticsWorkspaceName = '${resourceToken}-logs'
var vnetName = '${resourceToken}-vnet'
var storageAccountName = '${resourceToken}storage'
var containerRegistryName = '${resourceToken}acr'
var keyVaultName = '${resourceToken}-kv'
var postgresServerName = '${resourceToken}-postgres'
var redisCacheName = '${resourceToken}-redis'
var aiSearchName = '${resourceToken}-aisearch'
var containerAppEnvName = '${resourceToken}-cae'
var backendContainerAppName = '${projectName}-backend-api'
var frontendStaticWebAppName = '${projectName}-frontend-ui'

// --- Core Infrastructure: Logging and Networking ---
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = { name: logAnalyticsWorkspaceName, location: location, tags: tags, properties: { sku: { name: 'PerGB2018' }, retentionInDays: 30 } }
resource virtualNetwork 'Microsoft.Network/virtualNetworks@2023-05-01' = { name: vnetName, location: location, tags: tags, properties: { addressSpace: { addressPrefixes: [ '10.0.0.0/16' ] }, subnets: [ { name: 'container-apps-subnet', properties: { addressPrefix: '10.0.0.0/23' } }, { name: 'private-endpoints-subnet', properties: { addressPrefix: '10.0.2.0/24', privateEndpointNetworkPolicies: 'Disabled' } } ] } }

// --- Foundational Services: Storage, Registry, Key Vault ---
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
name: storageAccountName
  location: location
  tags: tags
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
}
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}
resource storageContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: storageContainerName
  properties: {
    publicAccess: 'None'
  }
}

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = { name: containerRegistryName, location: location, tags: tags, sku: { name: 'Basic' }, properties: { adminUserEnabled: true } }
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = { name: keyVaultName, location: location, tags: tags, properties: { sku: { family: 'A', name: 'standard' }, tenantId: subscription().tenantId, accessPolicies: [] } }

// --- Data and AI Services ---
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: postgresServerName
  location: location
  tags: tags
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword
    version: '15'
  }
}
resource db 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = { parent: postgresServer, name: databaseName }
resource postgresPrivateDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = { name: 'privatelink.postgres.database.azure.com', location: 'global' }
resource postgresPrivateDnsZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = { parent: postgresPrivateDnsZone, name: '${postgresServerName}-dnslink', location: 'global', properties: { registrationEnabled: false, virtualNetwork: { id: virtualNetwork.id } } }
resource postgresPrivateEndpoint 'Microsoft.Network/privateEndpoints@2023-05-01' = { name: '${postgresServerName}-pe', location: location, properties: { subnet: { id: resourceId('Microsoft.Network/virtualNetworks/subnets', vnetName, 'private-endpoints-subnet') }, privateLinkServiceConnections: [ { name: '${postgresServerName}-pe-conn', properties: { privateLinkServiceId: postgresServer.id, groupIds: [ 'postgresqlServer' ] } } ] } }
resource redisCache 'Microsoft.Cache/redis@2023-08-01' = { name: redisCacheName, location: location, tags: tags, properties: { sku: { name: 'Standard', family: 'C', capacity: 0 }, enableNonSslPort: false, minimumTlsVersion: '1.2' } }
resource aiSearchService 'Microsoft.Search/searchServices@2023-11-01' = { name: aiSearchName, location: location, tags: tags, sku: { name: 'free' }, properties: { replicaCount: 1, partitionCount: 1, hostingMode: 'default' } }

// --- Storing Secrets in Key Vault ---
resource postgresPasswordSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = { parent: keyVault, name: 'PostgresPassword', properties: { value: postgresAdminPassword } }
resource redisPasswordSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = { parent: keyVault, name: 'RedisPassword', properties: { value: redisCache.listKeys().primaryKey } }
resource storageSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = { parent: keyVault, name: 'AzureStorageConnectionString', properties: { value: storageAccount.listKeys().keys[0].value } }
resource searchSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = { parent: keyVault, name: 'AzureSearchKey', properties: { value: aiSearchService.listAdminKeys().primaryKey } }
resource jwtSecretValue 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = { parent: keyVault, name: 'JwtSecret', properties: { value: jwtSecret } }
resource openRouterSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = { parent: keyVault, name: 'OpenRouterApiKey', properties: { value: openRouterApiKey } }

// --- Compute: Container App Environment and Backend App ---
resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = { name: containerAppEnvName, location: location, tags: tags, properties: { appLogsConfiguration: { destination: 'log-analytics', logAnalyticsConfiguration: { customerId: logAnalyticsWorkspace.properties.customerId, sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey } }, vnetConfiguration: { internal: false, infrastructureSubnetId: resourceId('Microsoft.Network/virtualNetworks/subnets', vnetName, 'container-apps-subnet') } } }

resource backendContainerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: backendContainerAppName
  location: location
  tags: tags
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      ingress: { external: true, targetPort: 3000 }
      secrets: [
        // These names are internal references for the 'env' block below.
        { name: 'postgres-password', keyVaultUrl: postgresPasswordSecret.properties.secretUri, identity: 'system' }
        { name: 'redis-password', keyVaultUrl: redisPasswordSecret.properties.secretUri, identity: 'system' }
        { name: 'azure-storage-connection-string', keyVaultUrl: storageSecret.properties.secretUri, identity: 'system' }
        { name: 'azure-search-key', keyVaultUrl: searchSecret.properties.secretUri, identity: 'system' }
        { name: 'jwt-secret', keyVaultUrl: jwtSecretValue.properties.secretUri, identity: 'system' }
        { name: 'openrouter-api-key', keyVaultUrl: openRouterSecret.properties.secretUri, identity: 'system' }
      ]
    }
    template: {
      containers: [
        {
          name: 'quill-backend'
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest' // Placeholder image
          resources: { cpu: json('0.5'), memory: '1.0Gi' }
          env: [
            // This block now perfectly matches your .env file structure
            { name: 'NODE_ENV', value: 'development' }
            { name: 'PORT', value: '3000' }

            // Database variables
            { name: 'DATABASE_HOST', value: postgresServer.properties.fullyQualifiedDomainName }
            { name: 'DATABASE_PORT', value: '5432' }
            { name: 'DATABASE_USERNAME', value: postgresAdminLogin }
            { name: 'DATABASE_PASSWORD', secretRef: 'postgres-password' }
            { name: 'DATABASE_NAME', value: databaseName }

            // JWT variables
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
            { name: 'JWT_EXPIRATION_TIME', value: '24h' }

            // Azure Storage variables
            { name: 'AZURE_STORAGE_CONNECTION_STRING', secretRef: 'azure-storage-connection-string' }
            { name: 'AZURE_STORAGE_CONTAINER_NAME', value: storageContainerName }

            // Azure AI Search variables
            { name: 'AZURE_SEARCH_ENDPOINT', value: 'https://${aiSearchName}.search.windows.net' }
            { name: 'AZURE_SEARCH_KEY', secretRef: 'azure-search-key' }
            { name: 'AZURE_SEARCH_INDEX_NAME', value: searchIndexName }

            // OpenRouter variables
            { name: 'OPENROUTER_API_KEY', secretRef: 'openrouter-api-key' }
            { name: 'OPENROUTER_REFERRER', value: 'http://localhost:3000' }
            { name: 'OPENROUTER_SITE_NAME', value: 'Quill Dev' }

            // Redis variables
            { name: 'REDIS_HOST', value: redisCache.properties.hostName }
            { name: 'REDIS_PORT', value: '${redisCache.properties.sslPort}' }
            { name: 'REDIS_PASSWORD', secretRef: 'redis-password' }
            { name: 'REDIS_TLS_ENABLED', value: 'true' }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 3 }
    }
  }
}

resource keyVaultAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2023-07-01' = { parent: keyVault, name: 'add', properties: { accessPolicies: [ { tenantId: subscription().tenantId, objectId: backendContainerApp.identity.principalId, permissions: { secrets: [ 'get', 'list' ] } } ] } }

// --- Frontend: Static Web App ---
// resource frontendStaticWebApp 'Microsoft.Web/staticSites@2023-01-01' = { name: frontendStaticWebAppName, location: location, tags: tags, sku: { name: 'Free' } }

// --- Outputs ---
output backendHostName string = backendContainerApp.properties.configuration.ingress.fqdn
// output frontendUrl string = 'https://${frontendStaticWebApp.properties.defaultHostname}'
output containerRegistryLoginServer string = containerRegistry.properties.loginServer
output keyVaultName string = keyVault.name