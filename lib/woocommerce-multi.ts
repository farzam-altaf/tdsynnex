import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api'
import { supabase } from './supabase/client'
interface SiteConfig {
  id: string
  site_url: string
  site_name: string
  consumer_key: string
  consumer_secret: string
  is_primary: boolean
  is_active: boolean
}

class MultiSiteWooCommerce {
  private clients = new Map<string, WooCommerceRestApi>()
  private siteConfigs = new Map<string, SiteConfig>()

  async initialize() {
    // Load all site configurations from database
    const { data: sites, error } = await supabase
      .from('woocommerce_sites')
      .select('*')
      .eq('is_active', true)

    if (error) {
      console.error('Failed to load site configs:', error)
      return
    }

    sites.forEach(site => {
      this.siteConfigs.set(site.site_url, site)
      
      this.clients.set(site.site_url, new WooCommerceRestApi({
        url: site.site_url,
        consumerKey: site.consumer_key,
        consumerSecret: site.consumer_secret,
        version: 'wc/v3',
        queryStringAuth: true,
        axiosConfig: {
          timeout: 10000,
          headers: {
            'User-Agent': 'GlobalStockSync/1.0'
          }
        }
      }))
    })
  }

  getClient(siteUrl: string): WooCommerceRestApi | null {
    return this.clients.get(siteUrl) || null
  }

  getSiteConfig(siteUrl: string): SiteConfig | undefined {
    return this.siteConfigs.get(siteUrl)
  }

  getPrimarySite(): SiteConfig | undefined {
    return Array.from(this.siteConfigs.values())
      .find(site => site.is_primary)
  }

  getAllSites(): SiteConfig[] {
    return Array.from(this.siteConfigs.values())
  }

  getOtherSites(excludeSiteUrl: string): SiteConfig[] {
    return this.getAllSites()
      .filter(site => site.site_url !== excludeSiteUrl)
  }

  async addSite(config: Omit<SiteConfig, 'id'>): Promise<void> {
    const { data, error } = await supabase
      .from('woocommerce_sites')
      .insert([config])
      .select()
      .single()

    if (!error && data) {
      this.siteConfigs.set(data.site_url, data)
      this.clients.set(data.site_url, new WooCommerceRestApi({
        url: data.site_url,
        consumerKey: data.consumer_key,
        consumerSecret: data.consumer_secret,
        version: 'wc/v3'
      }))
    }
  }

  async updateSite(siteUrl: string, updates: Partial<SiteConfig>): Promise<void> {
    const { error } = await supabase
      .from('woocommerce_sites')
      .update(updates)
      .eq('site_url', siteUrl)

    if (!error) {
      const config = this.siteConfigs.get(siteUrl)
      if (config) {
        Object.assign(config, updates)
      }
    }
  }
}

export const wooMulti = new MultiSiteWooCommerce()

// Initialize on import
if (typeof window === 'undefined') {
  wooMulti.initialize()
}