import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { wooMulti } from '@/lib/woocommerce-multi'

export async function POST(req: NextRequest) {
  try {
    // Body parsing
    const body = await req.json()
    const { sku, siteId, action } = body

    if (!sku || !siteId) {
      return NextResponse.json({ error: 'SKU and siteId are required' }, { status: 400 })
    }

    // Admin authentication
    const adminKey = req.headers.get('x-admin-key')
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get site details
    const { data: site, error: siteError } = await supabase
      .from('woocommerce_sites')
      .select('*')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('global_products')
      .select('*')
      .eq('sku', sku)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found in global products' }, { status: 404 })
    }

    // WooCommerce client
    const wooClient = wooMulti.getClient(site.site_url)
    if (!wooClient) {
      return NextResponse.json({ error: `No client for site: ${site.site_url}` }, { status: 400 })
    }

    // Check existing product
    const { data: existingProducts } = await wooClient.get('products', { sku, per_page: 1 })
    let wooProductId: number

    if (existingProducts?.length) {
      wooProductId = existingProducts[0].id
      await wooClient.put(`products/${wooProductId}`, {
        stock_quantity: product.stock_quantity,
        manage_stock: true
      })
    } else {
      const { data: newProduct } = await wooClient.post('products', {
        name: product.product_name,
        sku: product.sku,
        type: 'simple',
        regular_price: '0.00',
        manage_stock: true,
        stock_quantity: product.stock_quantity,
        status: 'publish'
      })
      wooProductId = newProduct.id
    }

    // Update mapping
    await supabase.from('product_site_mapping').upsert({
      product_sku: sku,
      site_id: siteId,
      woo_product_id: wooProductId,
      last_synced: new Date().toISOString()
    })

    // Update site sync status
    await supabase
      .from('woocommerce_sites')
      .update({ last_sync: new Date().toISOString(), sync_status: 'success' })
      .eq('id', siteId)

    return NextResponse.json({
      success: true,
      message: `Product ${sku} synced to ${site.site_name}`,
      data: {
        sku,
        productName: product.product_name,
        stock: product.stock_quantity,
        site: site.site_name,
        wooProductId
      }
    })

  } catch (error: any) {
    console.error('Product sync error:', error)

    // Update site sync status (best effort)
    if (req.headers.get('x-admin-key')) {
      const siteId = (await req.json()).siteId
      if (siteId) {
        await supabase
          .from('woocommerce_sites')
          .update({ sync_status: 'failed', last_sync: new Date().toISOString() })
          .eq('id', siteId)
      }
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
