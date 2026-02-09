import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase/client'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Admin authentication check
  const adminKey = req.headers['x-admin-key']
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data, error } = await supabase
      .from('woocommerce_sites')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    res.status(200).json({ success: true, data })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}