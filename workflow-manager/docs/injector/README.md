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
- Si una imagen externa deja de existir, el injector reintenta ese producto con una imagen placeholder para no bloquear toda la demo local.
- Las migraciones base crean el catalogo de roles/permisos, pero no usuarios demo.
- Antes de llamar APIs protegidas, el injector reconcilia los usuarios auth demo y entra con un operador demo que tenga los permisos de negocio requeridos por cada flujo.
- Las ventas se crean via `POST /api/v1/sales`.
- Las ventas en cuenta corriente confirman `createCustomerIfMissing` cuando el dataset referencia un cliente por nombre y todavia no existe.
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

Notas:

- estas 2 variables tambien las usa la app Next.js en runtime, pero aca se consumen para seeding
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` no es globalmente requerida por el injector, pero si es necesaria para comandos que inician sesion de operadores demo (`all`, `products`, `sales`, `debt-payments`)

Opcionales:

- `INJECTOR_APP_BASE_URL`
  - default: `http://127.0.0.1:3001`
- `INJECTOR_SUPABASE_URL`
  - override explicito del host Supabase para el injector
- `INJECTOR_SUPABASE_SERVICE_ROLE_KEY`
  - override explicito de service role key
- `INJECTOR_SUPABASE_ANON_KEY`
  - override explicito de anon key (requerido para login del demo system_admin)
- `INJECTOR_TARGET_NAME`
  - etiqueta de entorno para logs (ej: `local-development`, `staging`, `production`)
- `INJECTOR_ALLOW_REMOTE_WRITE`
  - default: `false`
  - si el target no es local (`localhost`/`127.0.0.1`), bloquea comandos mutantes salvo que este flag sea `true`
- `INJECTOR_ALLOW_DEMO_AUTH_USERS_ON_REMOTE`
  - default: `false`
  - bloquea `auth-users` y cualquier flujo que use el manifiesto demo en ambientes no locales
- `ENV_FILE`
  - para apuntar a otro archivo `.env`
- `INJECTOR_ENV_FILE`
  - alias preferido de `ENV_FILE`
- `INJECTOR_ONBOARDING_ADMIN_APP_USER_ID`
  - default: `user_admin_bootstrap`
- `INJECTOR_ONBOARDING_ADMIN_NAME`
  - default: `System Admin`
- `INJECTOR_ONBOARDING_ADMIN_EMAIL`
  - default: `admin@simple-pos.local`
- `INJECTOR_ONBOARDING_ADMIN_PASSWORD_LENGTH`
  - default: `20`
- `INJECTOR_ONBOARDING_ADMIN_RESET_PASSWORD`
  - default: `true`
  - si `false`, mantiene password existente cuando el auth user ya existe
- `INJECTOR_ONBOARDING_ADMIN_FORCE_EMAIL_CONFIRM`
  - default: `true`

## Uso

### Modo interactivo

```bash
bash workflow-manager/docs/injector/injector.sh
```

### Modo directo

```bash
bash workflow-manager/docs/injector/injector.sh all
bash workflow-manager/docs/injector/injector.sh auth-users
bash workflow-manager/docs/injector/injector.sh cleanup-demo-users
bash workflow-manager/docs/injector/injector.sh products
bash workflow-manager/docs/injector/injector.sh sales
bash workflow-manager/docs/injector/injector.sh debt-payments
bash workflow-manager/docs/injector/injector.sh onboarding-admin
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

Para bootstrap inicial de un entorno nuevo:

1. configurar `.env` del target (URL + keys)
2. `onboarding-admin`
3. guardar credenciales entregadas por consola en un vault
4. iniciar sesion en `/login` con ese usuario y terminar setup desde `/users-admin`

Para iterar por entidad:

1. `auth-users`
1. `products`
2. `sales`
3. `debt-payments`

## Desarrollo local rápido

Si querés resetear todo y volver a un estado listo para desarrollar con usuarios demo:

```bash
npm run supabase:reset:demo-auth
```

Si además querés arrancar Next.js con el env ya fresco:

```bash
npm run dev:demo
```

Importante:

- `supabase:reset` reescribe `.env.local` con keys locales nuevas
- si `next dev` ya estaba corriendo en `localhost:3001`, tenés que reiniciarlo o va a seguir usando las keys viejas en memoria
- cuando eso pasa, el login puede fallar con un mensaje de credenciales inválidas aunque el usuario demo exista correctamente

## Datasets

```text
workflow-manager/docs/injector/
|-- injector.sh
|-- injector.mjs
|-- README.md
`-- datasets/
    |-- access-control/demo-auth-users.json
    |-- products/demo-kiosk-carrefour-products.json
    |-- sales/demo-sales.json
    `-- debt-payments/demo-debt-payments.json
```

## Usuarios de prueba

Para login local y validacion de roles/permisos existe este manifiesto:

```text
workflow-manager/docs/injector/datasets/access-control/demo-auth-users.json
```

Incluye especialmente el `system_admin`:

- email: `soporte@simple-pos.test`
- password: `Soporte123!`

Tambien incluye operadores demo para:

- `business_manager`
- `cashier`
- `collections_clerk`
- `shift_supervisor`
- `catalog_manager`
- `executive_readonly`

Importante:

- estas credenciales son solo para desarrollo local
- `auth-users` ahora tambien crea o reconcilia los `app_users` demo, sus roles y la asignacion operativa de caja requerida por el POS
- `all`, `products`, `sales` y `debt-payments` reprovisionan automaticamente estos accesos antes de usar las APIs protegidas
- `products` entra con `catalog_manager` o `business_manager`
- `sales` entra con `business_manager`, `shift_supervisor` o `cashier`
- `debt-payments` entra con `business_manager` o `collections_clerk`
- pueden requerir reprovision desde `/users-admin` despues de `npm run supabase:reset`
- para retirar estos accesos demo de un entorno existente: `cleanup-demo-users`

## Cleanup de usuarios demo

Comando:

```bash
bash workflow-manager/docs/injector/injector.sh cleanup-demo-users
```

Que hace:

- elimina usuarios demo de Supabase Auth usando el manifiesto `demo-auth-users.json`
- elimina asignaciones de rol y de caja (`user_role_assignments`, `cash_register_user_assignments`)
- intenta eliminar los `app_users` demo
- si un `app_user` tiene referencias historicas (auditoria/ventas/sesiones), lo desactiva y desvincula el login (`is_active=false`, `auth_user_id=null`)

## Onboarding admin seguro

Comando:

```bash
bash workflow-manager/docs/injector/injector.sh onboarding-admin
```

Que hace:

- valida que exista el rol `system_admin`
- crea o reconcilia un `app_user` admin configurable por `.env`
- crea o actualiza su usuario en Supabase Auth
- imprime `email` y `password` generada aleatoriamente al final
- confirma que el hash de password lo maneja Supabase Auth (no se guarda texto plano en tablas `app_users`)

Seguridad:

- en targets no locales, los comandos mutantes quedan bloqueados por defecto
- para habilitar escritura remota: `INJECTOR_ALLOW_REMOTE_WRITE=true` o flag `--allow-remote-write`
- en targets no locales, `auth-users` demo queda bloqueado por defecto para evitar credenciales conocidas
- usar siempre credenciales de bootstrap efimeras y rotarlas despues del primer login

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
- El snapshot de productos Carrefour es curado y versionado. Si Carrefour cambia catalogo o imagenes, el dataset sigue siendo valido como referencia; cuando una imagen externa falla, el injector degrada a un placeholder para mantener la importacion operativa en local.
