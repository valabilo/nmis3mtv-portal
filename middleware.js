import { NextResponse } from 'next/server'

const PUBLIC_FILE = /\.(.*)$/

export function middleware(request) {
  const { pathname } = request.nextUrl
  const maintenanceEnabled = process.env.MAINTENANCE_MODE === 'true'

  if (!maintenanceEnabled) {
    return NextResponse.next()
  }

  const isMaintenancePage = pathname === '/maintenance'
  const isNextAsset = pathname.startsWith('/_next')
  const isPublicAsset = PUBLIC_FILE.test(pathname)

  if (isMaintenancePage || isNextAsset || isPublicAsset) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = '/maintenance'
  url.search = ''

  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!api).*)'],
}
