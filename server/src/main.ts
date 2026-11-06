import { APP_CONFIG } from './config/app.config.ts'
import { createApp } from './app.ts'

const { server, db, staticFiles } = await createApp()

server.listen(APP_CONFIG.port, APP_CONFIG.host, () => {
  console.log(`[Server] API-ն աշխատում է՝ http://localhost:${APP_CONFIG.port}${APP_CONFIG.apiPrefix}`)
  console.log(
    staticFiles.isEnabled
      ? `[Server] Կայքը մատուցվում է՝ http://localhost:${APP_CONFIG.port}`
      : `[Server] Կառուցված կայքը չի գտնվել (${APP_CONFIG.clientDistDir})։ Frontend-ի համար գործարկեք «npm run dev»։`,
  )
})

const shutdown = () => {
  console.log('\n[Server] Կանգնեցվում է...')
  server.close(() => {
    db.close()
    process.exit(0)
  })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
