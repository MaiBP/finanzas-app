# Miti-Miti

MVP de finanzas personales para parejas. Cada persona tiene su sesión, comparte un hogar y puede registrar movimientos personales o comunes. El flujo vertical de autenticación, hogar, gasto web, dashboard mensual, auditoría, Telegram y consultas IA está implementado.

## Arquitectura

- **Next.js 15 / App Router**: Server Components para lecturas y Server Actions para mutaciones.
- **Supabase**: Auth, PostgreSQL y RLS. Las funciones SQL encapsulan operaciones atómicas como crear un hogar o un gasto con reparto.
- **Dinero seguro**: todos los importes se almacenan como `bigint` en céntimos; nunca como coma flotante.
- **Auditoría**: un trigger de PostgreSQL registra cada alta, edición, soft delete o restauración de movimientos.
- **IA preparada**: `financial-message-parser` define el contrato Zod discriminado. El modelo solo podrá proponer acciones; nunca SQL ni escrituras directas.
- **Compartido por defecto**: los movimientos conversacionales se registran como compartidos, visibles y con reparto igual; solo pasan a personales cuando el usuario lo pide explícitamente.
- **Responsive**: sidebar de escritorio, navegación inferior móvil, tablas que se convierten en tarjetas.

## Puesta en marcha

Requisitos: Node.js 22+, npm y un proyecto de Supabase.

```bash
npm install
cp .env.example .env.local
npm run dev
```

En Windows PowerShell, copia el entorno con `Copy-Item .env.example .env.local`.

Configura en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-luna
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SUPABASE_SECRET_KEY`, `OPENAI_API_KEY` y `TELEGRAM_BOT_TOKEN` se reservan exclusivamente para rutas servidor. La Publishable key sí puede exponerse y queda protegida por RLS.

## Supabase

Con la CLI enlazada al proyecto:

```bash
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
npx supabase db seed
```


También puedes ejecutar todos los archivos de `supabase/migrations` en orden y después `supabase/seed.sql` desde el SQL Editor. En Authentication configura la Site URL y añade `http://localhost:3000/auth/callback` como redirect URL. El seed crea categorías globales, no usuarios ni contraseñas.

Al crear un hogar se genera automáticamente una cuenta conjunta y una invitación válida durante siete días. El primer gasto compartido crea un reparto igual entre todos los miembros, distribuyendo cualquier céntimo sobrante sin perder dinero.

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm test
npm run build
```


Las pruebas unitarias cubren importes, reparto 50/50, balances, permisos de edición, caducidad de códigos, secreto de Telegram y validación del JSON de IA. Las políticas RLS deben probarse además contra un proyecto Supabase local antes de producción.

## Telegram e IA

El endpoint valida `X-Telegram-Bot-Api-Secret-Token`, vincula usuarios con códigos de diez minutos y soporta `/start`, `/ayuda`, `/vincular`, `/resumen`, `/ultimos` y `/cancelar`. Los mensajes libres se interpretan con Responses API y Structured Outputs, y vuelven a validarse con Zod antes de cualquier acción. Borrados y acciones ambiguas pasan por `pending_actions`.

El bot acepta extractos PDF, Excel (`.xls`/`.xlsx`), CSV e imágenes JPG, PNG o WEBP de hasta 12 MB. La IA prepara una vista previa de hasta 60 movimientos y no escribe nada hasta recibir una confirmación explícita. Los movimientos son compartidos por defecto; la leyenda `personal` en el adjunto los dirige al espacio privado. Los posibles duplicados de la misma cuenta, fecha, importe y descripción se omiten al confirmar.

Los adjuntos se envían como Base64 directamente a Responses API con `store: false`; Miti-Miti no conserva el archivo ni crea un objeto en Files API. La política estándar de OpenAI puede mantener registros de control de abuso durante un máximo de 30 días, salvo que el proyecto tenga controles de retención aprobados.

Después del deploy, registra el webhook con el header secreto de Telegram apuntando a:

```text
POST https://TU-DOMINIO/api/telegram/webhook
```

Una vez que `NEXT_PUBLIC_APP_URL` apunte al dominio HTTPS desplegado, registra el webhook sin exponer el token en el historial de la terminal:

```bash
npm run telegram:webhook
```

Para consultar el estado sin modificarlo usa `npm run telegram:webhook:info`. Si el token pertenecía a otra aplicación y quieres descartar mensajes antiguos pendientes, ejecuta `npm run telegram:webhook -- --drop-pending`. Registrar un webhook nuevo reemplaza el anterior.

## Acceso con Google

La pantalla de acceso y registro usa OAuth con PKCE a través de Supabase. Para activarlo:

1. En Google Cloud crea un cliente OAuth de tipo aplicación web y añade como URI autorizada el callback que muestra Supabase, con formato `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
2. En Supabase, abre Authentication → Providers → Google, habilita el proveedor y guarda el Client ID y Client Secret de Google.
3. En Authentication → URL Configuration añade `https://finanzas-app-six-kappa.vercel.app/auth/callback` a Redirect URLs.

Para reiniciar completamente los datos de prueba sin tocar el esquema ni las categorías globales, `npm run data:reset:test` muestra primero el proyecto y los conteos. La eliminación solo se ejecuta añadiendo `-- --confirm-reset`. Como alternativa sin terminal, ejecuta `supabase/reset-test-data.sql` desde SQL Editor.

## Deploy en Vercel

Importa el repositorio en Vercel, añade las variables de entorno y usa los comandos estándar (`npm run build`). Actualiza `NEXT_PUBLIC_APP_URL` con el dominio final y añade su callback en Supabase Auth antes de publicar.

El análisis financiero genera recordatorios de pagos recurrentes, tendencias de gasto por categoría y tasa de ahorro. `vercel.json` ejecuta una revisión diaria a las 08:00 UTC para avisar por Telegram sin repetir el mismo insight. Configura `CRON_SECRET` en producción con un valor aleatorio y ejecuta la migración `202608040001_financial_insight_notifications.sql` antes de activar el cron.

## Decisiones y límites actuales

- Un usuario pertenece como máximo a un hogar (`unique(user_id)`). El resto del modelo admite más de dos miembros.
- Las eliminaciones son soft delete y RLS impide modificar movimientos ajenos.
- La pantalla inicial de movimientos ofrece búsqueda y filtro de tipo; edición, filtros avanzados y paginación se completarán en el siguiente incremento.
- Cuentas personales editables y reparto porcentual desde la UI todavía requieren el siguiente bloque.
- El asistente web ejecuta consultas predefinidas; las altas conversacionales completas se confirman y ejecutan actualmente desde Telegram.
- No se incluyen credenciales ni usuarios Auth ficticios. Para datos demo reproducibles se añadirá un script que use la Admin API en un entorno local.
