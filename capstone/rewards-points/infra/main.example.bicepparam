using './main.bicep'

param teamIdentifier = 'team01'
param location = 'eastus2'
param appServicePlanSku = 'B1'
param rewardsTableName = 'rewards'
param tags = {
  environment: 'workshop'
  owner: 'team01'
}
