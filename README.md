# Miti-Miti

Miti-Miti es una app de finanzas para parejas: cada persona mantiene su propio espacio personal (cuentas y movimientos privados) y comparte un hogar con su pareja para lo común. Todo se puede administrar desde la web o hablándole directamente a un bot de Telegram, por texto o por nota de voz.

## Qué hace

- **Web**: alta de movimientos, dashboard mensual, balance del hogar, exportación y auditoría de cambios.
- **Telegram + IA**: registrás gastos/ingresos o consultás tu situación financiera escribiendo o mandando un audio ("Gasté 20 euros en el súper", "¿cuánto gastamos este mes en comida?"). El bot también lee extractos bancarios (PDF, Excel, CSV o imagen) y arma una vista previa antes de registrar nada.
- **Privacidad primero**: la IA nunca recibe nombres reales (se reemplazan por "tú" / "tu pareja"), los campos de texto sensibles se cifran en la base (AES-256) y las cuentas personales nunca son visibles para el otro miembro del hogar.
- **Onboarding guiado**: aceptación de términos, creación o unión a un hogar (un hogar por persona), elección de canal (Telegram hoy, WhatsApp "próximamente") y vinculación paso a paso.
- **Salida de datos respetuosa**: se puede abandonar el hogar o eliminar la cuenta sin romper el historial compartido de la otra persona (los movimientos compartidos quedan, anonimizados).
- **Notificaciones proactivas**: resumen diario de gastos compartidos y recordatorios semanales por Telegram.

## Arquitectura

- **Next.js 15 / App Router**: Server Components para lecturas y Server Actions para mutaciones.
- **Supabase**: Auth, PostgreSQL y RLS. Las funciones SQL encapsulan operaciones atómicas como crear un hogar, salir de él o registrar un gasto con reparto.
- **Dinero seguro**: todos los importes se almacenan como `bigint` en céntimos; nunca como coma flotante.
- **Auditoría**: un trigger de PostgreSQL registra cada alta, edición, soft delete o restauración de movimientos.
- **IA preparada**: `financial-message-parser` define el contrato Zod discriminado. El modelo solo puede proponer acciones; nunca SQL ni escrituras directas. Las notas de voz se transcriben con la API de audio de OpenAI antes de entrar por el mismo camino que un mensaje escrito.
- **Compartido por defecto**: los movimientos conversacionales se registran como compartidos, visibles y con reparto igual; solo pasan a personales cuando el usuario lo pide explícitamente.
- **Rate limiting**: los mensajes y notas de voz de Telegram tienen límites atómicos por usuario (por minuto/hora/día) para no exponer la app a un gasto ilimitado en OpenAI.
- **Responsive**: sidebar de escritorio, navegación inferior móvil, tablas que se convierten en tarjetas.

## Entornos y flujo de ramas

| Entorno | Rama | Supabase | Telegram | Deploy |
|---|---|---|---|---|
| Local | cualquiera | el que definas en tu `.env.local` | tu propio bot de prueba | `npm run dev` |
| Staging | `dev` | proyecto Supabase de staging | bot de staging | automático en Vercel (proyecto `mitimiti-staging`) |
| Producción | `main` | proyecto Supabase de producción | bot real | automático en Vercel (proyecto de producción original) |

Flujo de trabajo: el desarrollo ocurre directamente sobre `dev` (push directo, sin ramas `feature/*`) — cada push dispara el deploy de staging automáticamente. Una vez validado ahí a mano, `dev` se mergea a `main` manualmente para desplegar a producción. Cada entorno de Vercel es un proyecto separado con sus propias variables de entorno — no comparten base de datos ni bot de Telegram entre sí. Un GitHub Action (`.github/workflows/ci.yml`) corre `typecheck`, `lint`, `test` y `build` en cada push a `dev`/`main` como red de seguridad.

**Importante**: mergear código nunca sincroniza esquemas de base de datos entre Supabase-staging y Supabase-producción. Cada migración nueva en `supabase/migrations/` se corre primero contra staging para probarla, y debe correrse manualmente contra producción antes o al mismo tiempo que el merge a `main`.

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
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=Finzy_AssistantBot
CRON_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
# 32 bytes aleatorios en base64 — generar con: openssl rand -base64 32
FIELD_ENCRYPTION_KEY=
```

`SUPABASE_SECRET_KEY`, `OPENAI_API_KEY` y `TELEGRAM_BOT_TOKEN` se reservan exclusivamente para rutas servidor. La Publishable key sí puede exponerse y queda protegida por RLS. `FIELD_ENCRYPTION_KEY` cifra los campos de texto sensibles (nombres, descripciones, historial de conversación) y debe ser distinta entre staging y producción — nunca reutilizar la misma clave entre dos bases de datos distintas.

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

Las notas de voz (hasta 2 minutos) se transcriben con la API de audio de OpenAI y el texto resultante entra por el mismo camino que un mensaje escrito, con la misma paridad para registrar movimientos o consultar finanzas. Cada usuario de Telegram tiene límites atómicos de mensajes (10/min, 100/hora, 300/día) y de notas de voz (20/hora) antes de que se llame a cualquier modelo de OpenAI, para evitar un gasto descontrolado.

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

Hay dos proyectos de Vercel separados apuntando al mismo repositorio, cada uno con su propia Production Branch:

- Proyecto de staging: Production Branch = `dev`, variables apuntando al Supabase y bot de Telegram de staging.
- Proyecto de producción: Production Branch = `main`, variables apuntando al Supabase y bot de Telegram reales.

En cada proyecto conviene configurar un **Ignored Build Step** para que solo builde su propia rama y no gaste minutos de build con pushes a `feature/*`:

```bash
if [ "$VERCEL_GIT_COMMIT_REF" == "dev" ]; then exit 1; else exit 0; fi   # proyecto staging
if [ "$VERCEL_GIT_COMMIT_REF" == "main" ]; then exit 1; else exit 0; fi  # proyecto producción
```

Actualiza `NEXT_PUBLIC_APP_URL` en cada proyecto con su propio dominio y añade su callback en Supabase Auth antes de publicar. Los cron jobs de `vercel.json` solo se disparan en el ambiente Production de cada proyecto, así que sí corren también en staging.

El análisis financiero genera recordatorios de pagos recurrentes, tendencias de gasto por categoría y tasa de ahorro. `vercel.json` ejecuta una revisión diaria a las 08:00 UTC para avisar por Telegram sin repetir el mismo insight. Configura `CRON_SECRET` en producción con un valor aleatorio y ejecuta la migración `202608040001_financial_insight_notifications.sql` antes de activar el cron.

## Decisiones y límites actuales

- Un usuario pertenece como máximo a un hogar (`unique(user_id)`). El resto del modelo admite más de dos miembros.
- Las eliminaciones son soft delete y RLS impide modificar movimientos ajenos.
- La pantalla de movimientos ofrece búsqueda, filtro de tipo y edición de movimientos propios; filtros avanzados y paginación se completarán en el siguiente incremento.
- Cuentas personales editables y reparto porcentual desde la UI todavía requieren el siguiente bloque.
- El asistente web ejecuta consultas predefinidas; las altas conversacionales completas se confirman y ejecutan actualmente desde Telegram.
- No se incluyen credenciales ni usuarios Auth ficticios. Para datos demo reproducibles se añadirá un script que use la Admin API en un entorno local.
