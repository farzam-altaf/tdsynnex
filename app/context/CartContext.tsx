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
        console.error('Error fetching product details:', error)
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
      console.error('Error enhancing cart:', error)
      return cartItems
    }
  }

  // Fetch cart items from database
  const fetchCartItems = async () => {
    // For guest users, fetch from localStorage
    if (!user?.id) {
      console.log('No user ID, checking localStorage for guest cart')
      const localCart = localStorage.getItem('guest_cart')
      if (localCart) {
        try {
          const parsedCart = JSON.parse(localCart)
          console.log('Found guest cart with items:', parsedCart.length)
          const enhancedCart = await enhanceCartWithProductDetails(parsedCart)
          setCartItems(enhancedCart)
        } catch (error) {
          console.error('Error parsing guest cart:', error)
          setCartItems([])
        }
      } else {
        console.log('No guest cart found in localStorage')
        setCartItems([])
      }
      setIsLoading(false)
      return
    }

    // For logged-in users, check verification first
    if (!checkUserVerification()) {
      console.log('User not verified, cannot fetch cart')
      setCartItems([])
      setIsLoading(false)
      
      return;
    }

    // User is logged in and verified - fetch from database
    setIsLoading(true)
    console.log('User is logged in and verified, fetching cart from database for user:', user.id)
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
        console.error('Error fetching cart items:', error)
        setCartItems([])
      } else {
        console.log('Successfully fetched cart items from database:', data?.length || 0)
        const parsedData = (data || []).map(item => ({
          ...item,
          quantity: parseQuantityFromDB(item.quantity)
        }))
        setCartItems(parsedData)
      }
    } catch (error) {
      console.error('Error fetching cart items:', error)
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
      console.log('User not verified, cannot sync cart')
      
      return;
    }

    const localCart = localStorage.getItem('guest_cart')
    if (!localCart) {
      console.log('No guest cart to sync')
      return
    }

    console.log('Syncing guest cart with database...')
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
          // Update quantity if exists
          console.log('Updating existing item quantity')
          const currentQuantity = parseQuantityFromDB(existingItem.quantity)
          const newQuantity = currentQuantity + item.quantity

          await supabase
            .from('cart')
            .update({ quantity: prepareQuantityForDB(newQuantity) })
            .eq('id', existingItem.id)
        } else {
          // Insert new item
          console.log('Inserting new item from guest cart')
          const { error } = await supabase
            .from('cart')
            .insert({
              product_id: item.product_id,
              quantity: prepareQuantityForDB(item.quantity),
              user_id: user.id
            })

          if (error) {
            console.error('Error inserting item during sync:', error)
          }
        }
      }

      // Clear localStorage after sync
      localStorage.removeItem('guest_cart')
      console.log('Guest cart synced and cleared from localStorage')

      // Refresh cart items to show synced items
      await fetchCartItems()
      setHasSynced(true) // Mark that sync has been done
    } catch (error) {
      console.error('Error syncing cart:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Add item to cart
  const addToCart = async (productId: string, quantity: number = 1) => {
    console.log('Adding to cart - Product ID:', productId, 'User logged in:', !!user?.id)

    // For logged-in users, check verification
    if (user?.id && !checkUserVerification()) {
      console.log('User not verified, cannot add to cart')
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
        // Guest user - store ONLY in localStorage
        console.log('Guest user - storing in localStorage')
        const localCart = localStorage.getItem('guest_cart')
        const guestCart = localCart ? JSON.parse(localCart) : []

        const existingIndex = guestCart.findIndex((item: CartItem) => item.product_id === productId)

        if (existingIndex >= 0) {
          console.log('Updating existing item in guest cart')
          guestCart[existingIndex].quantity += quantity
        } else {
          console.log('Adding new item to guest cart')
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
        console.log('Guest cart updated successfully')
      } else {
        // Logged in AND verified user - store ONLY in database
        console.log('Logged in and verified user - storing in database')

        // First, check if product exists in cart
        const { data: existingItem, error: checkError } = await supabase
          .from('cart')
          .select('*')
          .eq('user_id', user.id)
          .eq('product_id', productId)
          .single()

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned
          console.error('Error checking existing item:', checkError)
          throw checkError
        }

        if (existingItem) {
          // Update quantity
          console.log('Updating quantity for existing item')
          const currentQuantity = parseQuantityFromDB(existingItem.quantity)
          const newQuantity = currentQuantity + quantity

          const { error } = await supabase
            .from('cart')
            .update({ quantity: prepareQuantityForDB(newQuantity) })
            .eq('id', existingItem.id)

          if (error) {
            console.error('Error updating cart item:', error)
            throw error
          }
        } else {
          // Insert new item
          console.log('Inserting new item to cart table')
          const { error } = await supabase
            .from('cart')
            .insert({
              product_id: productId,
              quantity: prepareQuantityForDB(quantity),
              user_id: user.id
            })

          if (error) {
            console.error('Error inserting cart item:', error)
            console.error('Error details:', {
              code: error.code,
              message: error.message,
              details: error.details
            })
            throw error
          }
        }

        // Refresh cart items
        await fetchCartItems()
        console.log('Database cart updated successfully')
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
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
      console.log('User not verified, cannot remove from cart')
      toast.error('Your account is not verified. Please contact administrator.', {
        style: { background: "red", color: "white" },
      });
      throw new Error('Account not verified');
    }

    setIsUpdating(true)

    try {
      if (!user?.id) {
        // Guest user - remove from localStorage
        console.log('Guest user - removing from localStorage')
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
        // Logged in AND verified user - remove from database
        console.log('Logged in and verified user - removing from database')
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
      console.error('Error removing from cart:', error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }

  // Update item quantity
  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity < 1) {
      await removeFromCart(productId)
      return
    }

    // For logged-in users, check verification
    if (user?.id && !checkUserVerification()) {
      console.log('User not verified, cannot update quantity')
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

          // Fetch product details
          const enhancedCart = await enhanceCartWithProductDetails(updatedCart)
          setCartItems(enhancedCart)
        }
      } else {
        // Logged in AND verified user - update in database
        console.log('Updating quantity in database to:', quantity)
        const { error } = await supabase
          .from('cart')
          .update({ quantity: prepareQuantityForDB(quantity) })
          .eq('user_id', user.id)
          .eq('product_id', productId)

        if (error) {
          console.error('Error updating quantity in database:', error)
          throw error
        }

        // Refresh cart items
        await fetchCartItems()
        console.log('Quantity updated successfully')
      }
    } catch (error) {
      console.error('Error updating quantity:', error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }

  // Clear entire cart
  const clearCart = async () => {
    // For logged-in users, check verification
    if (user?.id && !checkUserVerification()) {
      console.log('User not verified, cannot clear cart')
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
      console.error('Error clearing cart:', error)
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
      console.log('Auth is still loading...')
      return
    }

    console.log('Auth loading complete. User:', user?.id, 'Profile verified:', profile?.isVerified)
    
    if (!user?.id) {
      // Guest user - fetch from localStorage
      fetchCartItems()
    } else if (user?.id && checkUserVerification()) {
      // Logged in AND verified user
      if (!hasSynced) {
        console.log('First time login, checking for guest cart to sync')
        // Check if there's a guest cart to sync
        const localCart = localStorage.getItem('guest_cart')
        if (localCart) {
          console.log('Found guest cart, syncing...')
          syncCartWithLocalStorage()
        } else {
          console.log('No guest cart found, fetching from database directly')
          fetchCartItems()
        }
      } else {
        console.log('Already synced, fetching cart from database')
        fetchCartItems()
      }
    } else {
      // Logged in but not verified
      console.log('User logged in but not verified')
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