import { supabase } from '@/lib/supabase/client'
import { NextApiRequest, NextApiResponse } from 'next'
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Security verification
  const apiKey = req.headers['x-wgss-api-key']
  const source = req.headers['x-wgss-source']
  const siteUrl = req.headers['x-wgss-site']
  
  if (!apiKey || !source || !siteUrl) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Verify API key
  const { data: site } = await supabase
    .from('woocommerce_sites')
    .select('api_key')
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .single()

  if (!site) {
    return res.status(401).json({ error: 'Invalid API key' })
  }

  const { sku } = req.body

  if (!sku) {
    return res.status(400).json({ error: 'SKU is required' })
  }

  try {
    // Check if product exists in global_products
    const { data: product, error } = await supabase
      .from('global_products')
      .select('sku')
      .eq('sku', sku)
      .single()

    if (error && error.code === 'PGRST116') {
      // Product not found
      return res.status(200).json({ exists: false })
    }

    if (error) {
      throw error
    }

    return res.status(200).json({ 
      exists: true,
      sku: product.sku
    })

  } catch (error: any) {
    console.error('Product check error:', error)
    return res.status(500).json({ error: error.message })
  }
}