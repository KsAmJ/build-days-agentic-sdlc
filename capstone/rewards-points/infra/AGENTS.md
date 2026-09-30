# Infrastructure agent guide — rewards-points capstone

Composes Azure infrastructure for the rewards-points capstone app. Mirrors the
reference `infra/` composition; it is independent and must not modify root
`infra/`.

- Use the pinned Azure Verified Modules documented in `README.md`; do not float
  versions or replace an AVM with handwritten resources.
- Keep environment-specific values in parameter files, not module logic.
- Use managed identities and GitHub OIDC; never introduce long-lived Azure
  credentials or enable storage shared keys.
- Scope deployments to the assigned team resource group.
- Run Bicep build/lint and Azure `what-if` before deployment.
- The native storage role assignment is intentional: placing it in the storage
  module would create a dependency cycle with the web app identity.
- Preserve Microsoft Entra ID-only Table Storage access.
- Expose deployment outputs needed for pull-request evidence, including the
  application URL and deployment identifier.

## Validation

```powershell
az bicep build --file .\capstone\rewards-points\infra\main.bicep
az deployment group validate --resource-group <team-resource-group> --parameters .\capstone\rewards-points\infra\main.example.bicepparam
az deployment group what-if --resource-group <team-resource-group> --parameters .\capstone\rewards-points\infra\main.example.bicepparam
```
