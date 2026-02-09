import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import crypto from 'crypto'
import { wooMulti } from '@/lib/woocommerce-multi'

export async function POST(req: NextRequest) {
  // 🔐 Admin auth
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== process.env.NEXT_PUBLIC_ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    site_url,
    site_name,
    consumer_key,
    consumer_secret,
    is_primary
  } = await req.json()

  try {
    if (!site_url.startsWith('http://') && !site_url.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Site URL must start with http:// or https://' },
        { status: 400 }
      )
    }

    const apiKey = crypto.randomBytes(32).toString('hex')

    if (is_primary) {
      await supabase
        .from('woocommerce_sites')
        .update({ is_primary: false })
        .neq('site_url', site_url)
    }

    const { data, error } = await supabase
      .from('woocommerce_sites')
      .upsert({
        site_url,
        site_name,
        consumer_key,
        consumer_secret,
        api_key: apiKey,
        is_primary,
        is_active: true,
        sync_status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Site URL already exists' },
          { status: 400 }
        )
      }
      throw error
    }

    await wooMulti.initialize()

    return NextResponse.json({
      success: true,
      data,
      apiKey
    })
  } catch (err: any) {
    console.error('Error adding site:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to add site' },
      { status: 500 }
    )
  }
}
