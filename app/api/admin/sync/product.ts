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

  const { sku, siteId, action } = req.body

  if (!sku || !siteId) {
    return res.status(400).json({ error: 'SKU and siteId are required' })
  }

  try {
    // Get site details
    const { data: site, error: siteError } = await supabase
      .from('woocommerce_sites')
      .select('*')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return res.status(404).json({ error: 'Site not found' })
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('global_products')
      .select('*')
      .eq('sku', sku)
      .single()

    if (productError) {
      return res.status(404).json({ error: 'Product not found in global products' })
    }

    // Get WooCommerce client
    const wooClient = wooMulti.getClient(site.site_url)
    if (!wooClient) {
      return res.status(400).json({ error: `No client for site: ${site.site_url}` })
    }

    // Check if product exists on WordPress
    const { data: existingProducts } = await wooClient.get('products', {
      sku,
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

    res.status(200).json({
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
    
    // Update site sync status
    await supabase
      .from('woocommerce_sites')
      .update({
        sync_status: 'failed',
        last_sync: new Date().toISOString()
      })
      .eq('id', siteId)

    res.status(500).json({ error: error.message })
  }
}