"use client"

import React, { useState, useEffect } from 'react'
import { wooMulti } from '@/lib/woocommerce-multi'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function MultiSiteDashboard() {
    const [sites, setSites] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [newSite, setNewSite] = useState({
        site_url: '',
        site_name: '',
        consumer_key: '',
        consumer_secret: '',
        is_primary: false
    })
    const [loading, setLoading] = useState(false)
    const [syncLoading, setSyncLoading] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [sitesRes, productsRes] = await Promise.all([
                supabase.from('woocommerce_sites').select('*').order('is_primary', { ascending: false }),
                supabase.from('global_products').select(`
          *,
          product_site_mapping (
            woo_product_id,
            woocommerce_sites (
              site_name,
              site_url
            )
          )
        `).order('updated_at', { ascending: false })
            ])

            setSites(sitesRes.data || [])
            setProducts(productsRes.data || [])
        } catch (error) {
            console.error('Failed to load data:', error)
            toast.error('Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    const addNewSite = async () => {
        if (!newSite.site_url || !newSite.site_name || !newSite.consumer_key || !newSite.consumer_secret) {
            toast.error('Please fill all fields')
            return
        }

        try {
            const response = await fetch('/api/admin/sites/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // IMPORTANT: Use NEXT_PUBLIC_ prefix for client-side access
                    'X-Admin-Key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'your-admin-key'
                },
                body: JSON.stringify(newSite)
            })

            // First check if response has content before parsing JSON
            const text = await response.text()
            let data = {}

            if (text) {
                try {
                    data = JSON.parse(text)
                } catch (parseError) {
                    console.error('Failed to parse JSON:', parseError)
                    toast.error('Server returned invalid response')
                    return
                }
            }

            if (response.ok) {
                toast.success('Site added successfully')
                setNewSite({
                    site_url: '',
                    site_name: '',
                    consumer_key: '',
                    consumer_secret: '',
                    is_primary: false
                })
                await loadData()
                await wooMulti.initialize()
            } else {
                toast.error((data as any).error || `Failed to add site (HTTP ${response.status})`)
            }
        } catch (error) {
            console.error('Failed to add site:', error)
            toast.error('Failed to add site')
        }
    }

    const testConnection = async (siteId: string) => {
        try {
            const site = sites.find(s => s.id === siteId)
            if (!site) return

            const response = await fetch('/api/admin/sites/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'your-admin-key'
                },
                body: JSON.stringify({ site_url: site.site_url })
            })

            const data = await response.json()

            if (response.ok) {
                toast.success(`Connection successful to ${site.site_name}`)
            } else {
                toast.error(`Connection failed: ${data.error}`)
            }
        } catch (error) {
            toast.error('Connection test failed')
        }
    }

    const syncProductToSite = async (sku: string, siteId: string) => {
        try {
            const response = await fetch('/api/admin/sync/product', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'your-admin-key'
                },
                body: JSON.stringify({ sku, siteId, action: 'manual_sync' })
            })

            const data = await response.json()

            if (response.ok) {
                toast.success(`Product ${sku} synced successfully`)
            } else {
                toast.error(`Sync failed: ${data.error}`)
            }
        } catch (error) {
            toast.error('Sync failed')
        }
    }

    const bulkSyncAll = async () => {
        try {
            setSyncLoading(true)
            const response = await fetch('/api/admin/sync/bulk', {
                method: 'POST',
                headers: {
                    'X-Admin-Key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'your-admin-key'
                }
            })

            const data = await response.json()

            if (response.ok) {
                toast.success(`Bulk sync completed: ${data.stats.synced} successful, ${data.stats.failed} failed`)
                await loadData()
            } else {
                toast.error(`Bulk sync failed: ${data.error}`)
            }
        } catch (error) {
            toast.error('Bulk sync failed')
        } finally {
            setSyncLoading(false)
        }
    }

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Multi-Site Stock Sync Dashboard</h1>

            {/* Add New Site Form */}
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
                <h2 className="text-xl font-semibold mb-4">Add New WooCommerce Site</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Site URL</label>
                        <input
                            type="text"
                            placeholder="https://example.com"
                            className="w-full border p-2 rounded"
                            value={newSite.site_url}
                            onChange={(e) => setNewSite({ ...newSite, site_url: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Site Name</label>
                        <input
                            type="text"
                            placeholder="My WordPress Site"
                            className="w-full border p-2 rounded"
                            value={newSite.site_name}
                            onChange={(e) => setNewSite({ ...newSite, site_name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Consumer Key</label>
                        <input
                            type="text"
                            placeholder="ck_..."
                            className="w-full border p-2 rounded"
                            value={newSite.consumer_key}
                            onChange={(e) => setNewSite({ ...newSite, consumer_key: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Consumer Secret</label>
                        <input
                            type="password"
                            placeholder="cs_..."
                            className="w-full border p-2 rounded"
                            value={newSite.consumer_secret}
                            onChange={(e) => setNewSite({ ...newSite, consumer_secret: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center md:col-span-2">
                        <input
                            type="checkbox"
                            id="is_primary"
                            checked={newSite.is_primary}
                            onChange={(e) => setNewSite({ ...newSite, is_primary: e.target.checked })}
                            className="mr-2"
                        />
                        <label htmlFor="is_primary" className="text-sm">Set as Primary Site</label>
                    </div>
                    <div className="md:col-span-2">
                        <button
                            onClick={addNewSite}
                            className="bg-green-600 text-white p-2 rounded hover:bg-green-700 w-full"
                        >
                            Add Site
                        </button>
                    </div>
                </div>
            </div>

            {/* Sites List */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Connected Sites ({sites.length})</h2>
                    <button
                        onClick={bulkSyncAll}
                        disabled={syncLoading}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        {syncLoading ? 'Syncing...' : 'Bulk Sync All Sites'}
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-8">Loading sites...</div>
                ) : sites.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No sites added yet</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sites.map(site => (
                            <div key={site.id} className="border rounded-lg p-4 bg-white shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold">{site.site_name}</h3>
                                    {site.is_primary && (
                                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                                            Primary
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 mb-2 break-all">{site.site_url}</p>
                                <div className="text-sm mb-2">
                                    <span className={`inline-block w-3 h-3 rounded-full mr-2 ${site.sync_status === 'success' ? 'bg-green-500' :
                                            site.sync_status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                                        }`}></span>
                                    Last Sync: {site.last_sync ? new Date(site.last_sync).toLocaleString() : 'Never'}
                                </div>
                                <div className="flex space-x-2 mt-4">
                                    <button
                                        onClick={() => testConnection(site.id)}
                                        className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                                    >
                                        Test Connection
                                    </button>
                                    <button
                                        onClick={() => syncProductToSite('TEST', site.id)}
                                        className="text-sm bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                                    >
                                        Sync Now
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Products with Site Mapping */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Products & Site Mapping</h2>
                {loading ? (
                    <div className="text-center py-8">Loading products...</div>
                ) : products.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No global products found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="border px-4 py-2 text-left">SKU</th>
                                    <th className="border px-4 py-2 text-left">Product Name</th>
                                    <th className="border px-4 py-2 text-left">Global Stock</th>
                                    {sites.map(site => (
                                        <th key={site.id} className="border px-4 py-2 text-left">
                                            {site.site_name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(product => (
                                    <tr key={product.id}>
                                        <td className="border px-4 py-2">{product.sku}</td>
                                        <td className="border px-4 py-2">{product.product_name}</td>
                                        <td className="border px-4 py-2 text-center">
                                            {product.stock_quantity}
                                        </td>
                                        {sites.map(site => {
                                            const mapping = product.product_site_mapping?.find(
                                                (m: any) => m.woocommerce_sites?.id === site.id
                                            )
                                            return (
                                                <td key={site.id} className="border px-4 py-2 text-center">
                                                    {mapping ? (
                                                        <span className="text-green-600">✓ Mapped</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => syncProductToSite(product.sku, site.id)}
                                                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                                                        >
                                                            Map
                                                        </button>
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}