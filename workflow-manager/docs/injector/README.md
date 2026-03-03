# Simple POS Demo Injector

Injector de datos de demostracion para `simple-pos`.

Este injector ya no usa tenants, claim templates ni entidades del proyecto anterior. Ahora siembra un escenario de kiosco para mostrar informacion realista en las pantallas principales del POS.

## Que genera

- `20` productos importados desde un snapshot curado de Carrefour.
- `5` categorias de kiosco:
  - `bebidas-gaseosas`
  - `bebidas-aguas`
  - `alfajores`
  - `galletitas`
  - `snacks`
- stock inicial variado:
  - con stock alto
  - con stock bajo
  - sin stock
  - algunos inactivos
- ventas mixtas:
  - `cash`
  - `on_account`
- pagos de deuda posteriores para mostrar estados `paid`, `partial` y `pending`.
- movimientos de stock de salida por cada venta para que productos, historial y reportes de profit queden coherentes.

## Pantallas cubiertas

Con `all` deberias poder navegar con data en:

- `Ventas`
- `Pedidos`
- `Productos`
- `Deudas`
- `Reportes`
- `Productos > sourcing`

Nota: `Sincronizacion` usa `localStorage` del navegador. Este injector siembra backend y storage, no la cola offline del browser.

## Como funciona

- Los productos se crean a traves de `POST /api/v1/product-sourcing/import`.
- Las imagenes se descargan desde `sourceImageUrl` y quedan guardadas en Supabase Storage (`product-sourcing-images`).
- Las ventas se crean via `POST /api/v1/sales`.
- Los movimientos de stock de salida se crean via `POST /api/v1/stock-movements`.
- Los pagos de deuda se crean via `POST /api/v1/debt-payments`.
- El cleanup usa Supabase REST para limpiar el entorno de desarrollo completo antes de regenerar la demo.

## Requisitos

- `node` 20+
- `bash`
- `curl` no es obligatorio para el main script, pero es util para verificar el entorno.
- Next.js corriendo para comandos que usan API del proyecto (`products`, `sales`, `debt-payments`, `all`).
- Supabase local o remoto accesible con service role.

## Variables de entorno

Por defecto intenta leer:

- `<repo>/.env.local`
- si faltan variables criticas, cae a `supabase status -o env`

Requeridas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Opcionales:

- `INJECTOR_APP_BASE_URL`
  - default: `http://127.0.0.1:3001`
- `ENV_FILE`
  - para apuntar a otro archivo `.env`

## Uso

### Modo interactivo

```bash
bash workflow-manager/docs/injector/injector.sh
```

### Modo directo

```bash
bash workflow-manager/docs/injector/injector.sh all
bash workflow-manager/docs/injector/injector.sh products
bash workflow-manager/docs/injector/injector.sh sales
bash workflow-manager/docs/injector/injector.sh debt-payments
bash workflow-manager/docs/injector/injector.sh status
bash workflow-manager/docs/injector/injector.sh show-all
bash workflow-manager/docs/injector/injector.sh clear-all
bash workflow-manager/docs/injector/injector.sh clear-all -f
```

## Orden recomendado

Para una demo completa:

1. levantar app + supabase
2. `clear-all -f`
3. `all`

Para iterar por entidad:

1. `products`
2. `sales`
3. `debt-payments`

## Datasets

```text
workflow-manager/docs/injector/
|-- injector.sh
|-- injector.mjs
|-- README.md
`-- datasets/
    |-- products/demo-kiosk-carrefour-products.json
    |-- sales/demo-sales.json
    `-- debt-payments/demo-debt-payments.json
```

## Notas de limpieza

- `clear-all` limpia toda la data funcional del proyecto en este entorno:
  - `products`
  - `inventory_items`
  - `stock_movements`
  - `sales`
  - `sale_items` via cascade
  - `customers`
  - `debt_ledger`
  - `sync_events`
  - `imported_product_sources`
  - `external_category_mappings`
- Tambien borra objetos de storage en:
  - `product-images`
  - `product-sourcing-images`
- No hace `supabase db reset`; limpia las tablas funcionales y buckets usados por la app.
- `show-all` imprime el snapshot del dataset demo gestionado por el injector, no un dump completo de toda la base.

## Limitaciones conocidas

- La cola offline de `Sincronizacion` vive en `localStorage`, asi que no puede sembrarse desde este injector backend-only.
- En `Ventas`, algunas chips de categorias son atajos visuales estaticos y pueden seguir visibles aunque no haya productos cargados.
- El snapshot de productos Carrefour es curado y versionado. Si Carrefour cambia catalogo o imagenes, el dataset sigue siendo valido como referencia, pero una reinyeccion puede depender de que el `sourceImageUrl` siga respondiendo.
