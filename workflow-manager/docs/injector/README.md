# Sample Data Injector

A modular injector to seed Supabase + local API with sample data in a scalable way.

## Goal

- Inject entities independently (`users`, `tenants`, `sku metadata`, etc.).
- Resolve relationships across files using references (`tenantRef`, `userRef`, `collectionRef`, `apiClientRef`).
- Upload SKU images to Storage and automatically link them in `claim_sku_metadata`.
- Run everything from a bash menu with clear success/error logs.

## Structure

```text
docs/injector/
|-- injector.sh
|-- lib/
|   |-- common.sh
|   |-- http.sh
|   |-- datasets.sh
|   |-- refs.sh
|   |-- relationships.sh
|   `-- storage.sh
|-- entities/
|   |-- users.sh
|   |-- tenants.sh
|   |-- tenant-members.sh
|   |-- api-clients.sh
|   |-- sku-collections.sh
|   |-- sku-metadata.sh
|   |-- claim-templates.sh
|   |-- inventory.sh
|   `-- orders.sh
|-- datasets/
|   |-- shared/brand-colors.json
|   |-- users/
|   |-- tenants/
|   |-- tenant-members/
|   |-- api-clients/
|   |-- sku-collections/
|   |-- sku-metadata/
|   |-- claim-templates/
|   |-- inventory/
|   `-- orders/
`-- assets/
    `-- skus/<SKU>/{brand.*,product.*}
```

## Requirements

- `bash`
- `curl`
- `jq`

## Environment Variables

By default it reads `<project-root>/.env.local`.

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:
- `INJECTOR_APP_BASE_URL` (default: `NEXT_PUBLIC_APP_URL` or `http://localhost:4000`)
- `INJECTOR_SKIP_API_STEPS=1` to skip `inventory` and `orders` in the full flow
- `INJECTOR_DATASETS_DIR` to use a custom datasets root directory
- `INJECTOR_PROFILE` to filter datasets by filename prefix (`<profile>-*.json`, default `all`)

## Usage

### Interactive Menu

```bash
bash workflow-manager/docs/injector/injector.sh
```

### Direct Mode (No Menu)

```bash
bash workflow-manager/docs/injector/injector.sh all
bash workflow-manager/docs/injector/injector.sh users
bash workflow-manager/docs/injector/injector.sh sku-metadata
bash workflow-manager/docs/injector/injector.sh customer
bash workflow-manager/docs/injector/injector.sh status
bash workflow-manager/docs/injector/injector.sh show-all
bash workflow-manager/docs/injector/injector.sh clear-all
bash workflow-manager/docs/injector/injector.sh clear-all -f
bash workflow-manager/docs/injector/injector.sh -f clear-all
```

## Recommended Order

1. `users`
2. `tenants`
3. `tenant-members`
4. `sku-collections`
5. `sku-metadata`
6. `claim-templates`
7. `api-clients`
8. `inventory`
9. `orders`

`all` runs this full sequence.

`customer` runs a minimal onboarding baseline:
1. `users`
2. `tenants`
3. `tenant-members`
4. `claim-templates`
5. `api-clients`

`show-all` prints a full database snapshot and a final summary with row counts per collection/table.

`clear-all` reuses the same `show-all` snapshot output, then asks for confirmation before deleting all injector-managed rows.

`clear-all -f` (or `-f clear-all`) skips the snapshot/listing step and goes directly to the confirmation prompt + deletion flow.

## New Customer Onboarding (Scalable)

Use `onboard-customer.sh` to generate a dedicated customer dataset and inject only the baseline entities for a new tenant.

1. Create an env file from [`examples/customer-onboarding.env.example`](./examples/customer-onboarding.env.example):

```bash
cp workflow-manager/docs/injector/examples/customer-onboarding.env.example .env.onboarding
```

2. Fill at least:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ONBOARD_TENANT_NAME`
- `ONBOARD_OWNER_EMAIL`
- `ONBOARD_OWNER_PASSWORD`

3. Run onboarding:

```bash
bash workflow-manager/docs/injector/onboard-customer.sh --env-file .env.onboarding
```

4. Preview without injecting:

```bash
bash workflow-manager/docs/injector/onboard-customer.sh --env-file .env.onboarding --dry-run
```

Notes:
- The script generates files prefixed with `customer-` and runs injector with `INJECTOR_PROFILE=customer`.
- This keeps demo datasets and customer onboarding datasets fully isolated.
- `ONBOARD_CREATE_API_CLIENT=true` creates an API client and API key for the new tenant.

## Relationship Convention

Each entity can define a local `key`, and other entities can reference it through `*Ref`.

Example:

```json
{
  "key": "api_global_default",
  "tenantRef": "tenant_global_demo",
  "createdByUserRef": "owner_demo",
  "name": "Global Demo Client",
  "apiKey": "dk_demo_global_001"
}
```

## SKU Images

- Place images in `docs/injector/assets/skus/<SKU>/brand.png` and `product.png`.
- The injector also supports SKU alias resolution for `US`/`USA` in folder names (for example `APPLE-US-10-USD` can resolve from `assets/skus/APPLE-USA-10-USD/...`).
- If a SKU image is missing, it falls back to `docs/injector/assets/brands/<brand>.png` or `docs/injector/assets/brands/<brand>-logo.png` when available.
- The injector uploads them to the tenant bucket (e.g. `claim-assets`) at:
  - `tenants/<tenant-id>/skus/<sku-normalized>/brand.<ext>`
  - `tenants/<tenant-id>/skus/<sku-normalized>/product.<ext>`
- Then it stores these paths in `claim_sku_metadata.brand_image_path` and `product_image_path`.

## Inventory Note

`inventory` is injected via `POST /api/inventory/upload` (not direct DB insert) so encryption and domain rules are preserved.
Make sure your Next.js server is running before using `inventory` or `orders`.

If the app is not reachable at `INJECTOR_APP_BASE_URL`, the injector now fails fast with a clear error before iterating records.

## Reuse Note

Datasets and assets in this folder are examples. Replace them with project-specific data before using the injector in another repository.
