'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'
import { toast } from 'sonner'

// Cart Item Interface (without price requirement)
export interface CartItem {
  id?: string
  product_id: string
  quantity: number
  user_id: string
  created_at?: string
  // Product details (joined from products table)
  product?: {
    id: string
    product_name: string
    sku: string
    slug: string
    thumbnail?: string
    stock_quantity: number
    withCustomer: number
    post_status: string
    // Price is optional since we're not requiring it
    price?: number
  }
}

// Cart Context Interface
interface CartContextType {
  cartItems: CartItem[]
  cartCount: number
  isLoading: boolean
  isUpdating: boolean
  addingProductId: string | null // Track which product is being added
  addToCart: (productId: string, quantity?: number) => Promise<void>
  removeFromCart: (productId: string) => Promise<void>
  updateQuantity: (productId: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  getCartTotal: () => number
  getCartTotalItems: () => number
  syncCartWithLocalStorage: () => Promise<void>
  refreshCart: () => Promise<void>
  isInCart: (productId: string) => boolean
}

// Create Context
const CartContext = createContext<CartContextType | undefined>(undefined)

// Provider Props
interface CartProviderProps {
  children: ReactNode
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const { user, profile, loading: authLoading } = useAuth()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [addingProductId, setAddingProductId] = useState<string | null>(null)
  const [hasSynced, setHasSynced] = useState(false) // Track if sync has been attempted

  // Calculate cart count
  const cartCount = cartItems.length;

  // Helper function to parse quantity from database (string to number)
  const parseQuantityFromDB = (quantity: any): number => {
    if (quantity === null || quantity === undefined) return 0
    const parsed = parseInt(quantity)
    return isNaN(parsed) ? 0 : parsed
  }

  // Helper function to prepare quantity for database (number to string)
  const prepareQuantityForDB = (quantity: number): string => {
    return quantity.toString()
  }

  // Helper function to check if product is in cart
  const isInCart = (productId: string): boolean => {
    return cartItems.some(item => item.product_id === productId);
  };

  // Helper function to check if user is verified
  const checkUserVerification = (): boolean => {
    // For guest users, allow cart operations
    if (!user?.id) {
      return true;
    }

    // For logged-in users, check if profile exists and isVerified is true
    if (profile && profile.isVerified === true) {
      return true;
    }

    return false;
  };

  // Helper function to fetch product details for cart items
  const enhanceCartWithProductDetails = async (cartItems: CartItem[]): Promise<CartItem[]> => {
    if (!cartItems.length) return cartItems

    try {
      // Get all product IDs from cart
      const productIds = cartItems.map(item => item.product_id)

      // Fetch product details
      const { data: products, error } = await supabase
        .from('products')
        .select('id, product_name, sku, slug, thumbnail, stock_quantity, post_status')
        .in('id', productIds)

      if (error) {
        return cartItems
      }

      // Create a map of product details
      const productMap = new Map()
      products?.forEach(product => {
        productMap.set(product.id, product)
      })

      // Enhance cart items with product details
      return cartItems.map(item => ({
        ...item,
        product: productMap.get(item.product_id)
      }))
    } catch (error) {
      return cartItems
    }
  }

  // Fetch cart items from database
  const fetchCartItems = async () => {
    // For guest users, fetch from localStorage
    if (!user?.id) {
      const localCart = localStorage.getItem('guest_cart')
      if (localCart) {
        try {
          const parsedCart = JSON.parse(localCart)
          const enhancedCart = await enhanceCartWithProductDetails(parsedCart)
          setCartItems(enhancedCart)
        } catch (error) {
          setCartItems([])
        }
      } else {
        setCartItems([])
      }
      setIsLoading(false)
      return
    }

    // For logged-in users, check verification first
    if (!checkUserVerification()) {
      setCartItems([])
      setIsLoading(false)

      return;
    }

    // User is logged in and verified - fetch from database
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('cart')
        .select(`
          *,
          product:products(
            id,
            product_name,
            sku,
            slug,
            thumbnail,
            stock_quantity,
            withCustomer,
            post_status
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        setCartItems([])
      } else {
        const parsedData = (data || []).map(item => ({
          ...item,
          quantity: parseQuantityFromDB(item.quantity)
        }))
        setCartItems(parsedData)
      }
    } catch (error) {
      setCartItems([])
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh cart manually
  const refreshCart = async () => {
    await fetchCartItems()
  }

  // Sync local storage cart with database when user logs in
  const syncCartWithLocalStorage = async () => {
    if (!user?.id) return

    // Check verification before syncing
    if (!checkUserVerification()) {
      return;
    }

    const localCart = localStorage.getItem('guest_cart')
    if (!localCart) {
      return
    }
    const guestCart = JSON.parse(localCart)

    try {
      setIsUpdating(true)
      // Add each item from localStorage to database
      for (const item of guestCart) {
        // Check if product already exists in user's cart
        const { data: existingItem } = await supabase
          .from('cart')
          .select('*')
          .eq('user_id', user.id)
          .eq('product_id', item.product_id)
          .single()

        if (existingItem) {
          const currentQuantity = parseQuantityFromDB(existingItem.quantity)
          const newQuantity = currentQuantity + item.quantity

          await supabase
            .from('cart')
            .update({ quantity: prepareQuantityForDB(newQuantity) })
            .eq('id', existingItem.id)
        } else {
          const { error } = await supabase
            .from('cart')
            .insert({
              product_id: item.product_id,
              quantity: prepareQuantityForDB(item.quantity),
              user_id: user.id
            })

          if (error) {
          }
        }
      }

      // Clear localStorage after sync
      localStorage.removeItem('guest_cart')

      // Refresh cart items to show synced items
      await fetchCartItems()
      setHasSynced(true) // Mark that sync has been done
    } catch (error) {
    } finally {
      setIsUpdating(false)
    }
  }

  // Add item to cart
  const addToCart = async (productId: string, quantity: number = 1) => {

    // For logged-in users, check verification
    if (user?.id && !checkUserVerification()) {
      toast.error('Your account is not verified. Please contact administrator.', {
        style: { background: "red", color: "white" },
      });
      throw new Error('Account not verified');
    }

    // Set the product being added
    setAddingProductId(productId)
    setIsUpdating(true)

    try {
      if (!user?.id) {
        const localCart = localStorage.getItem('guest_cart')
        const guestCart = localCart ? JSON.parse(localCart) : []

        const existingIndex = guestCart.findIndex((item: CartItem) => item.product_id === productId)

        if (existingIndex >= 0) {
          guestCart[existingIndex].quantity += quantity
        } else {
          guestCart.push({
            product_id: productId,
            quantity: quantity,
            user_id: 'guest'
          })
        }

        localStorage.setItem('guest_cart', JSON.stringify(guestCart))

        // Fetch product details for the new item
        const enhancedCart = await enhanceCartWithProductDetails(guestCart)
        setCartItems(enhancedCart)
      } else {

        // First, check if product exists in cart
        const { data: existingItem, error: checkError } = await supabase
          .from('cart')
          .select('*')
          .eq('user_id', user.id)
          .eq('product_id', productId)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError
        }

        if (existingItem) {
          const currentQuantity = parseQuantityFromDB(existingItem.quantity)
          const newQuantity = currentQuantity + quantity

          const { error } = await supabase
            .from('cart')
            .update({ quantity: prepareQuantityForDB(newQuantity) })
            .eq('id', existingItem.id)

          if (error) {
            throw error
          }
        } else {
          const { error } = await supabase
            .from('cart')
            .insert({
              product_id: productId,
              quantity: prepareQuantityForDB(quantity),
              user_id: user.id
            })

          if (error) {
            throw error
          }
        }

        // Refresh cart items
        await fetchCartItems()
      }
    } catch (error) {
      throw error
    } finally {
      setIsUpdating(false)
      setAddingProductId(null)
    }
  }

  // Remove item from cart
  const removeFromCart = async (productId: string) => {
    // For logged-in users, check verification
    if (user?.id && !checkUserVerification()) {
      toast.error('Your account is not verified. Please contact administrator.', {
        style: { background: "red", color: "white" },
      });
      throw new Error('Account not verified');
    }

    setIsUpdating(true)

    try {
      if (!user?.id) {
        const localCart = localStorage.getItem('guest_cart')
        if (localCart) {
          const guestCart = JSON.parse(localCart)
          const updatedCart = guestCart.filter((item: CartItem) => item.product_id !== productId)
          localStorage.setItem('guest_cart', JSON.stringify(updatedCart))

          // Fetch product details for remaining items
          const enhancedCart = await enhanceCartWithProductDetails(updatedCart)
          setCartItems(enhancedCart)
        }
      } else {
        const { error } = await supabase
          .from('cart')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId)

        if (error) throw error

        // Refresh cart items
        await fetchCartItems()
      }
    } catch (error) {
      throw error
    } finally {
      setIsUpdating(false)
    }
  }

  // Update item quantity
  // CartContext.ts میں updateQuantity function update کریں
  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity < 1) {
      await removeFromCart(productId)
      return
    }

    // For logged-in users, check verification
    if (user?.id && !checkUserVerification()) {
      toast.error('Your account is not verified. Please contact administrator.', {
        style: { background: "red", color: "white" },
      });
      throw new Error('Account not verified');
    }

    setIsUpdating(true)

    try {
      if (!user?.id) {
        // Guest user - update in localStorage
        const localCart = localStorage.getItem('guest_cart')
        if (localCart) {
          const guestCart = JSON.parse(localCart)
          const updatedCart = guestCart.map((item: CartItem) =>
            item.product_id === productId ? { ...item, quantity } : item
          )
          localStorage.setItem('guest_cart', JSON.stringify(updatedCart))

          // 🚨 FIX: Optimistically update local state without fetchCartItems
          setCartItems(prevItems => {
            return prevItems.map(item =>
              item.product_id === productId
                ? { ...item, quantity }
                : item
            )
          })
        }
      } else {
        const { error } = await supabase
          .from('cart')
          .update({ quantity: prepareQuantityForDB(quantity) })
          .eq('user_id', user.id)
          .eq('product_id', productId)

        if (error) {
          throw error
        }

        // 🚨 FIX: Optimistically update local state without fetchCartItems
        setCartItems(prevItems => {
          return prevItems.map(item =>
            item.product_id === productId
              ? { ...item, quantity }
              : item
          )
        })
      }
    } catch (error) {
      // Revert on error
      await fetchCartItems() // Only fetch if error occurs
      throw error
    } finally {
      setIsUpdating(false)
    }
  }

  // Clear entire cart
  const clearCart = async () => {
    // For logged-in users, check verification
    if (user?.id && !checkUserVerification()) {
      toast.error('Your account is not verified. Please contact administrator.', {
        style: { background: "red", color: "white" },
      });
      throw new Error('Account not verified');
    }

    setIsUpdating(true)

    try {
      if (!user?.id) {
        // Guest user - clear localStorage
        localStorage.removeItem('guest_cart')
        setCartItems([])
      } else {
        // Logged in AND verified user - clear database
        const { error } = await supabase
          .from('cart')
          .delete()
          .eq('user_id', user.id)

        if (error) throw error

        // Refresh cart items
        await fetchCartItems()
      }
    } catch (error) {
      throw error
    } finally {
      setIsUpdating(false)
    }
  }

  // Calculate cart total (price is optional)
  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.product?.price || 0
      return total + (price * item.quantity)
    }, 0)
  }

  // Get total number of items
  const getCartTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0)
  }

  // Initial fetch and sync when user changes - FIXED VERSION
  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!user?.id) {
      // Guest user - fetch from localStorage
      fetchCartItems()
    } else if (user?.id && checkUserVerification()) {
      // Logged in AND verified user
      if (!hasSynced) {
        const localCart = localStorage.getItem('guest_cart')
        if (localCart) {
          syncCartWithLocalStorage()
        } else {
          fetchCartItems()
        }
      } else {
        fetchCartItems()
      }
    } else {
      setCartItems([])
      setIsLoading(false)
    }
  }, [user?.id, authLoading, profile])

  // Context value
  const contextValue: CartContextType = {
    cartItems,
    cartCount,
    isLoading,
    isUpdating,
    addingProductId,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartTotalItems,
    syncCartWithLocalStorage,
    refreshCart,
    isInCart
  }

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  )
}

// Custom hook to use CartContext
export const useCart = () => {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}