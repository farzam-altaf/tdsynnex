import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { wooMulti } from '@/lib/woocommerce-multi'

export async function POST(req: NextRequest) {
  // Store request body for error handling
  let body: any;
  let siteId: string | undefined;
  
  try {
    // Body parsing - store for error handling
    body = await req.json()
    const { sku, siteId: bodySiteId, action } = body
    siteId = bodySiteId;

    if (!sku || !siteId) {
      return NextResponse.json({ error: 'SKU and siteId are required' }, { status: 400 })
    }

    // Admin authentication
    const adminKey = req.headers.get('x-admin-key')
    if (adminKey !== process.env.NEXT_PUBLIC_ADMIN_API_KEY) {
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

    // Validate WooCommerce site URL format
    const siteUrl = site.site_url.trim()
    if (!siteUrl.startsWith('http')) {
      return NextResponse.json({ error: `Invalid site URL format: ${siteUrl}` }, { status: 400 })
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

    // WooCommerce client - with enhanced error handling
    const wooClient = wooMulti.getClient(siteUrl)
    if (!wooClient) {
      return NextResponse.json({ 
        error: `No WooCommerce client configured for site: ${siteUrl}` 
      }, { status: 400 })
    }

    // Test WooCommerce connection first
    try {
      // Simple test request to verify connectivity
      await wooClient.get('products', { per_page: 1 })
    } catch (wcError: any) {
      console.error('WooCommerce connection test failed:', wcError.message)
      return NextResponse.json({ 
        error: `WooCommerce connection failed: ${wcError.message}`,
        details: 'Check API keys and site URL configuration'
      }, { status: 400 })
    }

    // Check existing product
    const { data: existingProducts } = await wooClient.get('products', { 
      sku, 
      per_page: 1 
    })
    
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
      .update({ 
        last_sync: new Date().toISOString(), 
        sync_status: 'success' 
      })
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
    
    // Don't try to parse body again - use stored values
    if (siteId) {
      try {
        await supabase
          .from('woocommerce_sites')
          .update({ 
            sync_status: 'failed', 
            last_sync: new Date().toISOString() 
          })
          .eq('id', siteId)
      } catch (supabaseError) {
        console.error('Failed to update sync status:', supabaseError)
      }
    }

    // Provide more helpful error messages
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.message?.includes('403')) {
      errorMessage = 'WooCommerce API authentication failed. Check API keys and permissions.';
      statusCode = 400;
    } else if (error.message?.includes('404')) {
      errorMessage = 'WooCommerce API endpoint not found. Check site URL configuration.';
      statusCode = 400;
    }

    return NextResponse.json({ 
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { details: error.stack })
    }, { status: statusCode })
  }
}