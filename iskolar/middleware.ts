import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/api/releases') || 
      request.nextUrl.pathname.startsWith('/admin/releases')) {
    if (!session) {
      return NextResponse.redirect(new URL('/admin-auth/signin', request.url));
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('role')
      .eq('user_id', user?.id)
      .single();

    if (!adminProfile) {
      return NextResponse.redirect(new URL('/admin-auth/signin', request.url));
    }
  }

  // If user is signed in and tries to access auth pages, redirect to scholar dashboard
  if (session && (
    request.nextUrl.pathname.startsWith('/auth/sign-in') ||
    request.nextUrl.pathname.startsWith('/auth/register')
  )) {
    return NextResponse.redirect(new URL('/scholar/announcements', request.url));
  }

  return response
}

// Configure which routes to run middleware on
export const config = {
  matcher: ['/auth/sign-in/:path*', '/auth/register/:path*']
}