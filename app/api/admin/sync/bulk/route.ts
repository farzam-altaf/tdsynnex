import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { wooMulti } from '@/lib/woocommerce-multi'

export async function POST(req: NextRequest) {

  // 🔐 Admin authentication
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== process.env.NEXT_PUBLIC_ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1️⃣ Get all Global products
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('inventory_type', 'Global')
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No Global products found',
        stats: { totalProducts: 0 }
      })
    }

    // 2️⃣ Get Woo sites
    const sites = wooMulti.getAllSites()
    if (!sites.length) {
      return NextResponse.json(
        { error: 'No WooCommerce sites configured' },
        { status: 400 }
      )
    }

    let syncedCount = 0
    let failedCount = 0
    const results: any[] = []

    // 3️⃣ Process each product
    for (const product of products) {

      const siteResults = await Promise.all(
        sites.map(async (site) => {
          try {
            const wooClient = wooMulti.getClient(site.site_url)
            if (!wooClient) {
              throw new Error(`No client for site: ${site.site_url}`)
            }

            // 🔍 Check existing product by SKU
            const { data: existingProducts } = await wooClient.get('products', {
              sku: product.sku,
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

            // 🧩 Save mapping
            await supabase
              .from('product_site_mapping')
              .upsert({
                product_sku: product.sku,
                site_id: site.id,
                woo_product_id: wooProductId,
                last_synced: new Date().toISOString()
              })

            syncedCount++

            return {
              site: site.site_name,
              sku: product.sku,
              success: true
            }

          } catch (err: any) {
            failedCount++
            return {
              site: site.site_name,
              sku: product.sku,
              success: false,
              error: err.message
            }
          }
        })
      )

      // 📦 Save global_products snapshot
      await supabase
        .from('global_products')
        .upsert({
          sku: product.sku,
          product_name: product.product_name,
          stock_quantity: product.stock_quantity,
          updated_at: new Date().toISOString()
        })

      results.push({
        product: product.product_name,
        sku: product.sku,
        siteResults
      })
    }

    // ✅ Done
    return NextResponse.json({
      success: true,
      message: 'Bulk sync completed',
      stats: {
        totalProducts: products.length,
        totalSites: sites.length,
        synced: syncedCount,
        failed: failedCount,
        totalOperations: products.length * sites.length
      },
      results
    })

  } catch (error: any) {
    console.error('Bulk sync error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
