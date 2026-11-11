# NFC backend

API NestJS que emite credenciales NFC firmadas con Ed25519. Guarda las llaves en PostgreSQL mediante Prisma 8; el servidor no usa archivos PEM.

## Preparación

Requiere Node.js 26 (versión local fijada: 26.13.0) y pnpm. package.json, .nvmrc y .node-version declaran esa versión. Prisma 8 está en versión candidata: se fijan `prisma@8.0.0-rc.27` y `@prisma/orm-postgres@8.0.0-rc.20`, siguiendo la guía oficial de Prisma 8. Esta versión usa contratos y `prisma db migrate`, sin `prisma generate` ni `@prisma/client`.

1. Ejecuta `pnpm install`.
2. Copia `.env.example` a `.env` y configura `DATABASE_URL` con tu conexión PostgreSQL, usando TLS según tu proveedor. Para Vercel usa una conexión con pool del proveedor.
3. Para desarrollo local, ejecuta `pnpm db:migrate`. En Vercel las migraciones se aplican automáticamente durante el despliegue.
   Al iniciar, se crea también una llave raíz Ed25519 en `root_keys` si no existe. Si no hay llaves emisoras, el backend genera la llave #1 como un par Ed25519 y lo guarda automáticamente. No requiere seed. Las instancias concurrentes conservan la misma llave mediante una inserción que omite conflictos y una lectura posterior de la llave persistida.

Opcionalmente, para conservar tarjetas emitidas con las llaves locales anteriores, ejecuta `pnpm db:seed` antes del primer arranque para importar `keys/issuer-1-private.pem` y `keys/issuer-1-public.pem`. Valida que coincidan y conserva la llave para que las tarjetas existentes sigan siendo válidas. Si ya existe la llave #1, no la reemplaza.

La importación manual solo es necesaria si deseas conservar una llave anterior; no se ejecuta en el despliegue normal.

No ejecutes el generador antiguo para reemplazar una llave en uso. La llave privada es un secreto: restringe el acceso a la tabla y utiliza una conexión cifrada en producción. El usuario de ejecución necesita SELECT e INSERT en `issuer_keys` y `root_keys` para inicializar la llave automáticamente; las migraciones necesitan permisos de creación de tablas. La conexión usada durante el despliegue debe tener permisos para aplicar las migraciones.

## Desarrollo

### Exportar la raíz pública

```powershell
pnpm keys:export-root
pnpm keys:export-root --format base64 --out keys/root-public.base64.txt
```

El comando lee la raíz existente de `root_keys` mediante Prisma y exporta solamente
su clave pública Ed25519. No crea, reemplaza ni rota las claves de la base. El archivo
por defecto es `keys/root-public.pem`; la huella SHA-256 se muestra en la consola.
`--out -` escribe la clave en la salida estándar y `--help` describe las opciones.
Si el archivo ya contiene otra clave, el comando pide elegir otro destino o usar
`--force` explícitamente.

Se utiliza `DATABASE_URL` del entorno o del `.env` local. Para exportar la raíz de
Neon, configura esa conexión antes de ejecutar el comando: una conexión local
exporta la raíz local, que puede ser distinta. También puedes cargar otro archivo:

```powershell
node --env-file=.env.production.local scripts/export-root-public-key.mts
```

Instala esta raíz por un canal de confianza en Go y Android. No la sustituyas
automáticamente al descargar cada manifiesto; su función es autenticarlo.

`pnpm start:dev` carga `.env` automáticamente. `pnpm build` compila la aplicación y `pnpm start:prod` ejecuta el resultado.

- `POST /credentials` con `{ "userId": "00123456" }` devuelve `{ "credential": "<base64>" }`.
- `GET /keys` devuelve un manifiesto con las llaves públicas emisoras, estados y fechas (segundos Unix), firmado por la llave raíz. Los clientes deben tener su llave pública raíz de confianza provisionada por un canal confiable. Las llaves privadas nunca se incluyen en la respuesta. Se firma con la emisora ACTIVE de mayor keyId; ROTATED y REVOKED se publican para que los clientes puedan aplicar su estado. Cambios de llaves o estados requieren reiniciar las instancias.
- El formato sigue siendo 6 bytes de payload y 64 bytes de firma, versión 1 y keyId 1.
- `pnpm format` aplica el formato con `vp fmt`; `pnpm format:check` lo verifica y `pnpm lint` ejecuta `vp lint` con análisis de tipos. La configuración está en `vite.config.ts`.
- `pnpm test`, `pnpm test:e2e` y `pnpm lint` verifican la aplicación. Las pruebas sustituyen la base y usan una llave efímera; no requieren secretos reales.

El esquema está en `prisma/schema.prisma` y la configuración en `prisma.config.ts`. Después de cambiarlo: ejecuta `pnpm db:contract`, `pnpm db:plan --name nombre` y revisa la migración antes de `pnpm db:migrate --advance-ref db`. Guarda en Git los contratos emitidos de `src/prisma/` y `migrations/`. La migración inicial asume una base vacía; para incorporar una base existente, verifica primero que su esquema coincida y sigue el procedimiento de `prisma db sign` de Prisma 8.

## Vercel

1. Usa Node.js 26 en Vercel, declarado mediante engines.node en package.json. Vercel administra la versión de parche del runtime. Importa el repositorio como proyecto NestJS; `vercel.json` incluye el framework y `src/main.ts` es el punto de entrada reconocido.
2. Configura `DATABASE_URL` en las variables del proyecto para cada entorno que uses.
3. La conexión `DATABASE_URL` debe estar disponible durante el build y tener permisos para aplicar las migraciones. No necesitas ejecutar migraciones manuales ni seed.
4. Despliega desde Vercel o con `pnpm deploy`.

`vercel.json` ejecuta `pnpm run vercel-build`: primero compila con `pnpm build` y, si termina correctamente, aplica las migraciones pendientes con `pnpm db:migrate --yes`. Si falla la compilación o una migración, el despliegue se detiene. Las migraciones provienen de los archivos guardados en Git; el despliegue no genera nuevas migraciones. El build de Vercel necesita acceso a PostgreSQL; `pnpm build` local sigue compilando sin conectarse a la base. No se requieren archivos PEM en Vercel. Si falta la llave, se genera y persiste durante el arranque. Si falla la conexión o la escritura, el arranque falla explícitamente y no usa una llave temporal. Cada instancia carga la llave al iniciar y la mantiene en memoria; vuelve a desplegar después de cambiarla. Usa una base independiente para previews que no deban firmar credenciales reales.

Referencias: [Prisma 8 con PostgreSQL](https://docs.prisma.io/docs/guides/upgrade-prisma-orm/postgresql), [NestJS en Vercel](https://vercel.com/kb/guide/ship-a-nestjs-app-on-vercel).
