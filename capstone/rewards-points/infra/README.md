# Rewards-points capstone infrastructure

This resource-group-scoped Bicep deployment creates the rewards-points app's
Storage account and `rewards` table, Log Analytics workspace, Application
Insights component, Linux App Service plan, and Linux web app. It mirrors the
reference `infra/` composition and is independent of it.

The web app uses a system-assigned managed identity. A native role assignment
grants that identity only **Storage Table Data Contributor** on the storage
account. Shared-key access is disabled; authorization is Microsoft Entra ID-only.
The web app requires HTTPS and TLS 1.2, disables FTP/SCM basic publishing
credentials, and sends diagnostics and telemetry to workspace-based Application
Insights.

## Pinned Azure Verified Modules

| Resource | Module | Version |
|---|---|---:|
| Storage account and table | `avm/res/storage/storage-account` | `0.33.1` |
| Log Analytics workspace | `avm/res/operational-insights/workspace` | `0.16.1` |
| Application Insights | `avm/res/insights/component` | `0.8.0` |
| App Service plan | `avm/res/web/serverfarm` | `0.7.0` |
| Linux web app | `avm/res/web/site` | `0.24.0` |

The role assignment is composed directly because the storage module cannot
consume the web app principal without creating a circular module dependency.

## Parameters

Copy `main.example.bicepparam` to an environment-specific file. The example
contains no subscription, tenant, or credential values. Resource names are
derived from the target resource group and `teamIdentifier`.

## Validate

```powershell
az bicep build --file .\capstone\rewards-points\infra\main.bicep
az deployment group validate `
  --resource-group <team-resource-group> `
  --parameters .\capstone\rewards-points\infra\main.example.bicepparam
az deployment group what-if `
  --name rewards-infra-preview `
  --resource-group <team-resource-group> `
  --parameters .\capstone\rewards-points\infra\main.example.bicepparam
```

`validate` and `what-if` require an authenticated Azure CLI session and access
to the assigned team resource group.

## Deploy

```powershell
az deployment group create `
  --name rewards-infra `
  --resource-group <team-resource-group> `
  --parameters .\capstone\rewards-points\infra\main.example.bicepparam
```

The deployment outputs the application name and HTTPS URL, deployment
identifier, monitoring resource names/IDs, and storage account/table details.
