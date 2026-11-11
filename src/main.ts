async function bootstrap() {
    const startedAt = performance.now()
    let stage = 'cargar módulos'
    const report = (state: string) => {
        console.info('[startup]', {
            state,
            stage,
            elapsedMs: Math.round(performance.now() - startedAt),
            node: process.version,
        })
    }

    report('iniciando')
    const pending = setInterval(() => report('esperando'), 10000)
    pending.unref()

    try {
        // Dynamic imports let the entrypoint report failures before dependencies load.
        const { NestFactory } = await import('@nestjs/core')
        const { AppModule } = await import('./app.module.js')
        report('completado')

        stage = 'crear aplicación'
        const app = await NestFactory.create(AppModule, { abortOnError: false })
        report('completado')

        stage = 'inicializar aplicación y claves'
        await app.init()
        report('completado')

        stage = 'abrir servidor HTTP'
        await app.listen(process.env.PORT ?? 3000)
        report('listo')
    } catch (error: unknown) {
        // Do not log connection strings, environment values, or private keys.
        console.error('[startup] falló', {
            stage,
            elapsedMs: Math.round(performance.now() - startedAt),
            errorType: error instanceof Error ? error.name : typeof error,
            code:
                typeof error === 'object' && error !== null && 'code' in error
                    ? String(error.code)
                    : undefined,
        })
        throw new Error(`No se pudo iniciar el backend: ${stage}`)
    } finally {
        clearInterval(pending)
    }
}
// Let Vercel finish importing the entrypoint while the HTTP server starts.
bootstrap().catch(() => {
    process.exitCode = 1
})
