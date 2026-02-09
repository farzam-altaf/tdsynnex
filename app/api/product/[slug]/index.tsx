import { useState } from 'react'
import { checkAndSyncGlobalProduct } from '@/lib/global-products'
import { supabase } from '@/lib/supabase/client'

// Inside your product detail component, add stock update form
function StockUpdateForm({ product, onUpdate }: any) {
  const [newStock, setNewStock] = useState(product.stock_quantity)
  const [updating, setUpdating] = useState(false)

  const handleStockUpdate = async () => {
    if (newStock === product.stock_quantity) return

    setUpdating(true)
    try {
      // Update in Supabase
      const { error } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id)

      if (error) throw error

      // If product is Global, sync with WordPress
      if (product.inventory_type === 'Global') {
        await checkAndSyncGlobalProduct(
          product.sku,
          newStock,
          product.product_name,
          product.inventory_type,
          'update'
        )
      }

      onUpdate(newStock)
      alert('Stock updated successfully!')

    } catch (error) {
      alert('Failed to update stock')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="mt-4 p-4 border rounded">
      <h3 className="font-bold mb-2">Update Stock</h3>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={newStock}
          onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
          className="border p-2 rounded w-32"
        />
        <button
          onClick={handleStockUpdate}
          disabled={updating}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {updating ? 'Updating...' : 'Update Stock'}
        </button>
      </div>
      {product.inventory_type === 'Global' && (
        <p className="text-sm text-green-600 mt-2">
          ✓ This is a Global product. Stock will sync with all WordPress sites.
        </p>
      )}
    </div>
  )
}