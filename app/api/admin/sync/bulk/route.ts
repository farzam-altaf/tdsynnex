import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase/client'
import { wooMulti } from '@/lib/woocommerce-multi'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Admin authentication
  const adminKey = req.headers['x-admin-key']
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get all Global products from Supabase
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('inventory_type', 'Global')
      .order('created_at', { ascending: false })

    if (error) throw error

    const sites = wooMulti.getAllSites()
    
    if (sites.length === 0) {
      return res.status(400).json({ error: 'No WooCommerce sites configured' })
    }

    let syncedCount = 0
    let failedCount = 0
    const results = []

    // Process each product
    for (const product of products) {
      try {
        // Save to global_products table
        await supabase
          .from('global_products')
          .upsert({
            sku: product.sku,
            product_name: product.product_name,
            stock_quantity: product.stock_quantity,
            updated_at: new Date().toISOString()
          })

        // Sync to each WordPress site
        const sitePromises = sites.map(async (site) => {
          try {
            const wooClient = wooMulti.getClient(site.site_url)
            if (!wooClient) {
              throw new Error(`No client for site: ${site.site_url}`)
            }

            // Check if product exists on WordPress
            const { data: existingProducts } = await wooClient.get('products', {
              sku: product.sku,
              per_page: 1
            })

            let wooProductId = null

            if (existingProducts && existingProducts.length > 0) {
              // Update existing
              wooProductId = existingProducts[0].id
              await wooClient.put(`products/${wooProductId}`, {
                stock_quantity: product.stock_quantity,
                manage_stock: true
              })
            } else {
              // Create new
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

          } catch (error: any) {
            failedCount++
            return {
              site: site.site_name,
              sku: product.sku,
              success: false,
              error: error.message
            }
          }
        })

        const siteResults = await Promise.all(sitePromises)
        results.push({
          product: product.product_name,
          sku: product.sku,
          siteResults
        })

      } catch (error: any) {
        console.error(`Failed to sync product ${product.sku}:`, error)
        failedCount++
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk sync completed`,
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
    res.status(500).json({ error: error.message })
  }
}