import { NextApiRequest, NextApiResponse } from 'next'
import { wooMulti } from '@/lib/woocommerce-multi'
import { supabase } from '@/lib/supabase/client'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Security verification
  const apiKey = req.headers['x-wgss-api-key']
  const source = req.headers['x-wgss-source']
  const siteUrl = req.headers['x-wgss-site']
  
  if (!await verifyRequest(apiKey, source, siteUrl)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { action } = req.query
  const body = req.body

  try {
    switch (action) {
      case 'reduce':
        await handleStockReduce(body, siteUrl as string)
        break
        
      case 'restore':
        await handleStockRestore(body, siteUrl as string)
        break
        
      case 'manual':
        await handleManualUpdate(body, siteUrl as string)
        break
        
      case 'order':
        await handleNextJsOrder(body)
        break
        
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
    
    res.status(200).json({ success: true })
  } catch (error: any) {
    console.error('Stock sync error:', error)
    await logError(error, siteUrl as string, action as string, body)
    res.status(500).json({ error: error.message })
  }
}

async function verifyRequest(apiKey: any, source: any, siteUrl: any): Promise<boolean> {
  // Method 1: API Key validation
  if (apiKey) {
    const { data } = await supabase
      .from('woocommerce_sites')
      .select('api_key')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single()
    
    return !!data
  }
  
  // Method 2: Source + site validation
  if (source === 'woo' && siteUrl) {
    const siteConfig = wooMulti.getSiteConfig(siteUrl as string)
    return !!siteConfig
  }
  
  return false
}

// NEW: Handle orders from Next.js
async function handleNextJsOrder(orderData: {
  sku: string
  quantity: number
  orderId: string
  siteUrl?: string
}) {
  const { sku, quantity, orderId, siteUrl } = orderData
  
  // Get product
  const { data: product, error } = await supabase
    .from('global_products')
    .select('*')
    .eq('sku', sku)
    .single()

  if (error) throw new Error(`Product not found: ${sku}`)
  
  const newStock = product.stock_quantity - quantity
  
  if (newStock < 0) {
    throw new Error(`Insufficient stock for SKU: ${sku}`)
  }

  // Update global stock
  const { error: updateError } = await supabase
    .from('global_products')
    .update({
      stock_quantity: newStock,
      updated_at: new Date().toISOString()
    })
    .eq('sku', sku)

  if (updateError) throw updateError

  // Sync to ALL WooCommerce sites (including primary)
  const allSites = wooMulti.getAllSites()
  
  await syncStockToWooCommerceSites(sku, newStock, allSites, 'nextjs_order')

  // Log the transaction
  await supabase.from('stock_sync_logs').insert({
    product_sku: sku,
    site_url: siteUrl || 'nextjs',
    action: 'reduce_from_nextjs',
    old_stock: product.stock_quantity,
    new_stock: newStock,
    quantity,
    order_id: orderId,
    source: 'nextjs',
    created_at: new Date().toISOString()
  })
}

async function handleStockReduce(data: any, siteUrl: string) {
  const { sku, qty, order_id } = data
  
  // Check if product is global
  const { data: product, error } = await supabase
    .from('global_products')
    .select('*')
    .eq('sku', sku)
    .single()

  if (error) {
    // Product not found in global - not a global product
    await logNonGlobalProduct(sku, siteUrl, 'reduce')
    return // ✅ No action for non-global products
  }
  
  const newStock = product.stock_quantity - qty
  
  if (newStock < 0) {
    throw new Error(`Insufficient stock for SKU: ${sku}`)
  }

  // Update global stock
  const { error: updateError } = await supabase
    .from('global_products')
    .update({
      stock_quantity: newStock,
      updated_at: new Date().toISOString()
    })
    .eq('sku', sku)

  if (updateError) throw updateError

  // Sync to OTHER WooCommerce sites (excluding source site)
  const otherSites = wooMulti.getOtherSites(siteUrl)
  
  await syncStockToWooCommerceSites(sku, newStock, otherSites, 'reduce')

  // Log the transaction
  await supabase.from('stock_sync_logs').insert({
    product_sku: sku,
    site_url: siteUrl,
    action: 'reduce',
    old_stock: product.stock_quantity,
    new_stock: newStock,
    quantity: qty,
    order_id,
    source: 'woocommerce',
    created_at: new Date().toISOString()
  })
}

// Stock restoration handler (for cancelled/refunded orders)
async function handleStockRestore(data: any, siteUrl: string) {
  const { sku, qty, order_id } = data
  
  // Check if product is global
  const { data: product, error } = await supabase
    .from('global_products')
    .select('*')
    .eq('sku', sku)
    .single()

  if (error) {
    // Product not found in global - not a global product
    await logNonGlobalProduct(sku, siteUrl, 'restore')
    return // ✅ No action for non-global products
  }
  
  const newStock = product.stock_quantity + qty

  // Update global stock
  const { error: updateError } = await supabase
    .from('global_products')
    .update({
      stock_quantity: newStock,
      updated_at: new Date().toISOString()
    })
    .eq('sku', sku)

  if (updateError) throw updateError

  // Sync to OTHER WooCommerce sites (excluding source site)
  const otherSites = wooMulti.getOtherSites(siteUrl)
  
  await syncStockToWooCommerceSites(sku, newStock, otherSites, 'restore')

  // Log the transaction
  await supabase.from('stock_sync_logs').insert({
    product_sku: sku,
    site_url: siteUrl,
    action: 'restore',
    old_stock: product.stock_quantity,
    new_stock: newStock,
    quantity: qty,
    order_id,
    source: 'woocommerce',
    created_at: new Date().toISOString()
  })
}

// Manual stock update handler (from WordPress admin)
async function handleManualUpdate(data: any, siteUrl: string) {
  const { sku, stock } = data
  
  // Check if product is global
  const { data: product, error } = await supabase
    .from('global_products')
    .select('*')
    .eq('sku', sku)
    .single()

  if (error) {
    // Product not found - might be new product or non-global
    // Let's check if we should create it
    await logNonGlobalProduct(sku, siteUrl, 'manual')
    
    // Check if we should create this as global product
    // You might want to add additional logic here
    console.log(`Product ${sku} not found in global products during manual update`)
    return
  }
  
  // Update global stock
  const { error: updateError } = await supabase
    .from('global_products')
    .update({
      stock_quantity: stock,
      updated_at: new Date().toISOString()
    })
    .eq('sku', sku)

  if (updateError) throw updateError

  // Sync to OTHER WooCommerce sites (excluding source site)
  const otherSites = wooMulti.getOtherSites(siteUrl)
  
  await syncStockToWooCommerceSites(sku, stock, otherSites, 'manual_update')

  // Log the transaction
  await supabase.from('stock_sync_logs').insert({
    product_sku: sku,
    site_url: siteUrl,
    action: 'manual_update',
    old_stock: product.stock_quantity,
    new_stock: stock,
    source: 'woocommerce',
    created_at: new Date().toISOString()
  })
}

async function syncStockToWooCommerceSites(
  sku: string, 
  stock: number, 
  sites: any[], 
  action: string
) {
  const syncPromises = sites.map(async (site) => {
    try {
      const wooClient = wooMulti.getClient(site.site_url)
      if (!wooClient) {
        throw new Error(`No client for site: ${site.site_url}`)
      }

      // Get product mapping
      const { data: mapping } = await supabase
        .from('product_site_mapping')
        .select('woo_product_id')
        .eq('product_sku', sku)
        .eq('site_id', site.id)
        .single()

      let wooProductId = mapping?.woo_product_id

      // If no mapping, try to find by SKU
      if (!wooProductId) {
        const { data: products } = await wooClient.get('products', {
          sku,
          per_page: 1
        })
        
        if (products && products.length > 0) {
          wooProductId = products[0].id
          
          // Save mapping for future
          await supabase.from('product_site_mapping').upsert({
            product_sku: sku,
            site_id: site.id,
            woo_product_id: wooProductId,
            last_synced: new Date().toISOString()
          })
        } else {
          // ❌ SKU mismatch - product not found on this site
          await logSkuMismatch(sku, site.site_url)
          return
        }
      }

      // Update stock on WooCommerce
      await wooClient.put(`products/${wooProductId}`, {
        stock_quantity: stock,
        manage_stock: true
      })

      // Update site sync status
      await supabase
        .from('woocommerce_sites')
        .update({
          last_sync: new Date().toISOString(),
          sync_status: 'success'
        })
        .eq('id', site.id)

      // Log successful sync
      await supabase.from('stock_sync_logs').insert({
        product_sku: sku,
        site_url: site.site_url,
        action: `sync_${action}`,
        new_stock: stock,
        source: 'nextjs',
        success: true,
        created_at: new Date().toISOString()
      })

    } catch (error: any) {
      console.error(`Failed to sync to ${site.site_url}:`, error)
      
      // Update site sync status
      await supabase
        .from('woocommerce_sites')
        .update({
          sync_status: 'failed',
          last_sync: new Date().toISOString()
        })
        .eq('id', site.id)

      // Log failed sync
      await supabase.from('stock_sync_logs').insert({
        product_sku: sku,
        site_url: site.site_url,
        action: `sync_${action}`,
        new_stock: stock,
        source: 'nextjs',
        success: false,
        error_message: error.message,
        created_at: new Date().toISOString()
      })
    }
  })
  
  await Promise.all(syncPromises)
}

async function logNonGlobalProduct(sku: string, siteUrl: string, action: string) {
  await supabase.from('stock_sync_logs').insert({
    product_sku: sku,
    site_url: siteUrl,
    action: action,
    source: 'woocommerce',
    success: false,
    error_message: 'Non-global product - no action taken',
    created_at: new Date().toISOString()
  })
}

async function logSkuMismatch(sku: string, siteUrl: string) {
  await supabase.from('stock_sync_logs').insert({
    product_sku: sku,
    site_url: siteUrl,
    action: 'sync',
    source: 'nextjs',
    success: false,
    error_message: 'SKU mismatch - product not found on target site',
    created_at: new Date().toISOString()
  })
}

async function logError(error: any, siteUrl: string, action: string, data: any) {
  await supabase.from('stock_sync_logs').insert({
    product_sku: data.sku,
    site_url: siteUrl,
    action: action,
    source: data.source || 'unknown',
    success: false,
    error_message: error.message,
    metadata: JSON.stringify(data),
    created_at: new Date().toISOString()
  })
}