import { supabase } from './supabase/client'
import { wooMulti } from './woocommerce-multi'

export async function checkAndSyncGlobalProduct(
  sku: string,
  stockQuantity: number,
  productName: string,
  inventoryType: string,
  action: 'create' | 'update'
) {
  try {
    // Only proceed if inventory type is "Global"
    if (inventoryType !== 'Global') {
      console.log(`Product ${sku} is not marked as Global. No sync needed.`)
      return
    }

    // Log activity
    console.log(`Syncing Global product ${sku} to WordPress sites...`)

    // 1. First, save to global_products table
    const { data: globalProduct, error: globalError } = await supabase
      .from('global_products')
      .upsert({
        sku,
        product_name: productName,
        stock_quantity: stockQuantity,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (globalError) {
      throw new Error(`Failed to save global product: ${globalError.message}`)
    }

    // 2. Sync to all connected WordPress sites
    const sites = wooMulti.getAllSites()
    
    const syncPromises = sites.map(async (site) => {
      try {
        const wooClient = wooMulti.getClient(site.site_url)
        if (!wooClient) {
          throw new Error(`No client for site: ${site.site_url}`)
        }

        // Check if product already exists on WordPress
        const { data: existingProducts } = await wooClient.get('products', {
          sku,
          per_page: 1
        })

        if (existingProducts && existingProducts.length > 0) {
          // Update existing product
          const wooProduct = existingProducts[0]
          
          await wooClient.put(`products/${wooProduct.id}`, {
            stock_quantity: stockQuantity,
            manage_stock: true
          })

          // Update mapping
          await supabase.from('product_site_mapping').upsert({
            product_sku: sku,
            site_id: site.id,
            woo_product_id: wooProduct.id,
            last_synced: new Date().toISOString()
          })

          console.log(`Updated product ${sku} on ${site.site_name}`)

        } else {
          // Create new product on WordPress
          const { data: newProduct } = await wooClient.post('products', {
            name: productName,
            sku: sku,
            type: 'simple',
            regular_price: '0.00', // Default price, can be updated later
            manage_stock: true,
            stock_quantity: stockQuantity,
            status: 'publish'
          })

          // Update mapping
          await supabase.from('product_site_mapping').upsert({
            product_sku: sku,
            site_id: site.id,
            woo_product_id: newProduct.id,
            last_synced: new Date().toISOString()
          })

          console.log(`Created product ${sku} on ${site.site_name}`)
        }

        // Log successful sync
        await supabase.from('stock_sync_logs').insert({
          product_sku: sku,
          site_url: site.site_url,
          action: 'initial_sync',
          new_stock: stockQuantity,
          source: 'nextjs',
          success: true,
          created_at: new Date().toISOString()
        })

      } catch (error: any) {
        console.error(`Failed to sync ${sku} to ${site.site_url}:`, error)
        
        // Log failed sync
        await supabase.from('stock_sync_logs').insert({
          product_sku: sku,
          site_url: site.site_url,
          action: 'initial_sync',
          new_stock: stockQuantity,
          source: 'nextjs',
          success: false,
          error_message: error.message,
          created_at: new Date().toISOString()
        })
      }
    })

    await Promise.all(syncPromises)

    console.log(`Successfully synced Global product ${sku} to all WordPress sites`)

  } catch (error: any) {
    console.error(`Failed to sync Global product ${sku}:`, error)
    throw error
  }
}