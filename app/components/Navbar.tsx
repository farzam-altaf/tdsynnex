'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Disclosure } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { IoIosSearch, IoIosClose } from 'react-icons/io'
import { CiCircleChevDown, CiUser } from 'react-icons/ci'
import { IoCartOutline } from 'react-icons/io5'
import { Badge, Drawer } from 'antd'
import { Bell, Search, ShoppingCart, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext' // Add this import

const shopManager = process.env.NEXT_PUBLIC_SHOPMANAGER;
const admin = process.env.NEXT_PUBLIC_ADMINISTRATOR;

type NavigationItem = { name: string; href: string }

const publicNavigation: NavigationItem[] = [
  { name: 'Home', href: '/' },
  { name: 'How it Works', href: '/how-it-works' },
  { name: 'Products', href: '/product-category/alldevices' },
]

const authNavigation: NavigationItem[] = [
  { name: 'Report a Win', href: '/wins' },
  { name: '360Dashboard', href: '/360dashboard' },
]

const menuItems = [
  { name: 'Register', href: '/account-registration' },
  { name: 'Login', href: '/login' },
]

const authMenuItems = [
  { name: 'Edit Profile', href: '/edit-profile' },
  { name: 'Password reset', href: '/password-reset' },
  { name: 'Logout', href: 'logout' },
]

// Interface for product search results
interface ProductSearchResult {
  id: string;
  product_name: string;
  sku: string;
  slug: string;
  thumbnail?: string;
  stock_quantity: number;
  post_status: string;
}

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [totalProducts, setTotalProducts] = useState(0)
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const userMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const {
    cartItems,
    cartCount,
    isLoading: cartLoading,
    isUpdating: cartUpdating,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal
  } = useCart() // Use cart context

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsUserMenuOpen(false)
    router.replace('/login')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Calculate total price using cart context
  const calculateTotal = () => {
    return getCartTotal()
  }

  // Handle cart item removal
  const handleRemoveFromCart = async (productId: string) => {
    try {
      await removeFromCart(productId)
    } catch (error) {
      console.error('Error removing from cart:', error)
    }
  }

  // Handle quantity update
  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    try {
      // Ensure newQuantity is a valid number
      const quantity = Math.max(1, newQuantity);
      await updateQuantity(productId, quantity);
    } catch (error) {
      console.error('Error updating quantity:', error);
      // Show error message to user
    }
  };

  // Handle clear cart
  const handleClearCart = async () => {
    try {
      await clearCart()
    } catch (error) {
      console.error('Error clearing cart:', error)
    }
  }

  // Fetch search results
  const fetchSearchResults = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setTotalProducts(0)
      return
    }

    setIsSearching(true)
    try {
      const { data: products, error, count } = await supabase
        .from('products')
        .select('id, product_name, sku, slug, thumbnail, stock_quantity, post_status', { count: 'exact' })
        .or(`product_name.ilike.%${query}%,sku.ilike.%${query}%`)
        .limit(5)

      if (error) {
        console.error('Search error:', error)
        setSearchResults([])
        setTotalProducts(0)
      } else {
        setSearchResults(products || [])
        setTotalProducts(count || 0)
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
      setTotalProducts(0)
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounce search input
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }

    searchDebounceRef.current = setTimeout(() => {
      fetchSearchResults(searchQuery)
    }, 300)

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [searchQuery, fetchSearchResults])

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])


  const handleCart = () => {
    router.replace('/cart');
    setIsCartDrawerOpen(false);
  };


  // Focus search input when dropdown opens
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [isSearchOpen])

  // Check if user role matches allowed roles
  const showAuthNavigation =
    profile && (profile.role === admin || profile.role === shopManager);

  const navigation =
    !loading && isLoggedIn && showAuthNavigation
      ? [...publicNavigation, ...authNavigation]
      : publicNavigation;

  const handleUserMenuMouseEnter = () => {
    if (userMenuTimeoutRef.current) {
      clearTimeout(userMenuTimeoutRef.current)
    }
    setIsUserMenuOpen(true)
  }

  const handleUserMenuMouseLeave = () => {
    userMenuTimeoutRef.current = setTimeout(() => {
      setIsUserMenuOpen(false)
    }, 200)
  }

  const handleDropdownMouseEnter = () => {
    if (userMenuTimeoutRef.current) {
      clearTimeout(userMenuTimeoutRef.current)
    }
  }

  const handleDropdownMouseLeave = () => {
    userMenuTimeoutRef.current = setTimeout(() => {
      setIsUserMenuOpen(false)
    }, 200)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/product-category/${encodeURIComponent(searchQuery.trim())}?q=search`)
      setSearchQuery('')
      setIsSearchOpen(false)
      setIsMobileSearchOpen(false)
      setSearchResults([])
    }
  }

  const handleMobileSearchClick = () => {
    setIsMobileSearchOpen(true)
    setTimeout(() => {
      document.getElementById('mobile-search-input')?.focus()
    }, 100)
  }

  const handleProductClick = (slug: string) => {
    router.push(`/product/${slug}`)
    setSearchQuery('')
    setIsSearchOpen(false)
    setIsMobileSearchOpen(false)
    setSearchResults([])
  }

  const handleSeeAllClick = () => {
    if (searchQuery.trim()) {
      router.push(`/product-category/${encodeURIComponent(searchQuery.trim())}?q=search`)
      setSearchQuery('')
      setIsSearchOpen(false)
      setIsMobileSearchOpen(false)
      setSearchResults([])
    }
  }

  const handleCartClick = () => {
    setIsCartDrawerOpen(true);
  };

  const handleCheckout = () => {
    router.push('/checkout');
    setIsCartDrawerOpen(false);
  };

  const handleContinueShopping = () => {
    setIsCartDrawerOpen(false);
    router.push('/product-category/alldevices');
  };

  // Get stock quantity for a cart item
  const getItemStockQuantity = (cartItem: any) => {
    return cartItem.product?.stock_quantity || 0;
  };

  return (
    <>
      <Disclosure as="nav" className="sticky top-0 z-50 bg-white border-b border-gray-300">
        {({ open }) => (
          <>
            <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
              <div className="relative flex h-16 items-center justify-between">
                <div className="shrink-0 flex items-center">
                  <img src="/logo.png" alt="Logo" className="sm:h-9 h-6 w-auto" />
                </div>

                <div className="hidden sm:flex flex-1 justify-center items-center">
                  <div className="flex space-x-4">
                    {navigation.map((item) => {
                      const isProducts = item.name === 'Products'
                      const finalHref =
                        isProducts && !isLoggedIn ? '/login/?redirect_to=product-category/alldevices' : item.href

                      const isActive = pathname === finalHref

                      return (
                        <Link
                          key={item.name}
                          href={finalHref}
                          className={classNames(
                            isActive
                              ? 'text-[#35c8dc]'
                              : 'text-black hover:text-[#35c8dc]',
                            'rounded-md px-3 py-2 text-sm font-normal transition-colors duration-300 ease-in-out'
                          )}
                        >
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Link
                    href="/notification"
                    className="hidden lg:flex relative rounded-full p-1 text-black cursor-pointer"
                  >
                    <span className="sr-only">Notifications</span>
                    <Bell size={22} />
                  </Link>

                  {/* Desktop Search Button and Dropdown */}
                  <div className="hidden sm:block relative" ref={searchRef}>
                    <button
                      type="button"
                      className="relative rounded-full p-1 text-black cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                      onClick={() => setIsSearchOpen(!isSearchOpen)}
                    >
                      <span className="sr-only">Search</span>
                      <IoIosSearch size={22} />
                    </button>

                    {isSearchOpen && (
                      <div className="absolute right-0 top-full mt-2 w-[500px] bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <form onSubmit={handleSearchSubmit} className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2 flex-1">
                              <Search className="text-gray-400" size={20} />
                              <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search products..."
                                className="flex-1 border-0 focus:ring-0 focus:outline-none text-sm"
                              />
                              {searchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setSearchQuery('')}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <IoIosClose size={20} />
                                </button>
                              )}
                            </div>
                            <button
                              type="submit"
                              className="ml-2 px-3 py-1 bg-[#35c8dc] text-white rounded-md text-sm font-medium hover:bg-[#2db4c8] transition-colors"
                            >
                              Search
                            </button>
                          </div>

                          {/* Search Results Dropdown */}
                          {(searchQuery.trim() && (isSearching || searchResults.length > 0)) && (
                            <div className="border-t border-gray-100 pt-2 mt-2">
                              {isSearching ? (
                                <div className="py-3 text-center text-gray-500 text-sm">
                                  Searching...
                                </div>
                              ) : searchResults.length > 0 ? (
                                <>
                                  <div className="space-y-2 max-h-72 overflow-y-auto">
                                    {searchResults.slice(0, 4).map((product) => (
                                      <button
                                        key={product.id}
                                        onClick={() => handleProductClick(product.slug)}
                                        className="w-full text-left px-3 cursor-pointer hover:bg-gray-50 rounded-md transition-colors flex items-start space-x-3 group"
                                      >
                                        {product.thumbnail ? (
                                          <img
                                            src={product.thumbnail}
                                            alt={product.product_name}
                                            className="w-10 h-10 object-contain"
                                          />
                                        ) : (
                                          <div className="w-10 h-10 bg-gray-100 flex items-center justify-center rounded">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 group-hover:text-[#35c8dc]">
                                            {product.product_name}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            SKU: {product.sku}
                                          </p>
                                          <div className="flex items-center space-x-2 mt-1">
                                            {product.stock_quantity === 0 && (
                                              <span className="text-xs text-red-500 font-medium">
                                                Out of stock
                                              </span>
                                            )}
                                            {product.post_status !== 'Publish' && (
                                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                                Private
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>

                                  {/* See All Products Link */}
                                  {totalProducts > 4 && (
                                    <div className="border-t border-gray-100 pt-2 mt-2">
                                      <button
                                        onClick={handleSeeAllClick}
                                        className="w-full text-center text-sm cursor-pointer text-[#35c8dc] hover:text-[#2db4c8] font-medium py-2"
                                      >
                                        See all {totalProducts} products
                                      </button>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="py-3 text-center text-gray-500 text-sm">
                                  No products found
                                </div>
                              )}
                            </div>
                          )}
                        </form>
                      </div>
                    )}
                  </div>

                  <div className="relative hidden sm:flex items-center">
                    <button
                      className="flex items-center space-x-1 rounded-full p-2 cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                      onMouseEnter={handleUserMenuMouseEnter}
                      onMouseLeave={handleUserMenuMouseLeave}
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    >
                      <CiUser size={24} />
                      <CiCircleChevDown
                        size={16}
                        className={classNames(
                          isUserMenuOpen ? 'rotate-180' : 'rotate-0',
                          'transition-transform duration-200'
                        )}
                      />
                    </button>

                    {isUserMenuOpen && (
                      <div
                        className="absolute right-0 cursor-pointer top-full mt-2 w-36 origin-top-right rounded-md bg-white shadow-lg z-50 border border-gray-200"
                        onMouseEnter={handleDropdownMouseEnter}
                        onMouseLeave={handleDropdownMouseLeave}
                      >
                        {isLoggedIn ? (
                          authMenuItems.map((item) => {
                            const isActive = pathname === item.href

                            if (item.href === 'logout') {
                              return (
                                <button
                                  key={item.name}
                                  onClick={handleLogout}
                                  className="w-full text-left block px-4 py-2 text-sm hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                                >
                                  Logout
                                </button>
                              )
                            }

                            return (
                              <Link
                                key={item.name}
                                href={item.href}
                                className={classNames(
                                  isActive
                                    ? 'bg-[#35c8dc] text-white'
                                    : 'text-gray-700 hover:bg-gray-100',
                                  'block px-4 py-2 text-sm transition-colors duration-200'
                                )}
                                onClick={() => setIsUserMenuOpen(false)}
                                onMouseEnter={handleDropdownMouseEnter}
                              >
                                {item.name}
                              </Link>
                            )
                          })
                        ) : (
                          menuItems.map((item) => {
                            const isActive = pathname === item.href

                            return (
                              <Link
                                key={item.name}
                                href={item.href}
                                className={classNames(
                                  isActive
                                    ? 'bg-[#35c8dc] text-white'
                                    : 'text-gray-700 hover:bg-gray-100',
                                  'block px-4 py-2 text-sm transition-colors duration-200'
                                )}
                                onClick={() => setIsUserMenuOpen(false)}
                                onMouseEnter={handleDropdownMouseEnter}
                              >
                                {item.name}
                              </Link>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Cart Button */}
                  <button
                    type="button"
                    onClick={handleCartClick}
                    disabled={cartUpdating || cartLoading}
                    className="relative rounded-full p-1 sm:mt-1 mt-2 text-black cursor-pointer hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Cart</span>
                    <Badge
                      count={cartCount}
                      size="small"
                      overflowCount={99}
                      showZero={true}
                      style={{
                        backgroundColor: '#ef4444',
                        fontSize: '10px',
                        height: '18px',
                        minWidth: '18px',
                        lineHeight: '18px',
                        top: '1px',
                        right: '1px'
                      }}
                    >
                      <div className="relative">
                        <IoCartOutline size={26} />
                      </div>
                    </Badge>
                  </button>

                  {/* Mobile Search Button */}
                  <div className="sm:hidden">
                    <button
                      type="button"
                      className="relative rounded-full p-1 text-black cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                      onClick={handleMobileSearchClick}
                    >
                      <span className="sr-only">Search</span>
                      <IoIosSearch size={22} />
                    </button>
                  </div>

                  <div className="sm:hidden relative">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center space-x-1 rounded-full p-2 hover:bg-gray-100 transition-colors duration-200"
                    >
                      <CiUser size={24} />
                    </button>

                    {isUserMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-36 origin-top-right rounded-md bg-white shadow-lg z-50 border border-gray-200">
                        {isLoggedIn ? (
                          authMenuItems.map((item) => {
                            if (item.href === 'logout') {
                              return (
                                <button
                                  key={item.name}
                                  onClick={handleLogout}
                                  className="w-full text-left block px-4 py-2 text-sm  hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                                >
                                  {item.name}
                                </button>
                              )
                            }

                            const isActive = pathname === item.href

                            return (
                              <Link
                                key={item.name}
                                href={item.href!}
                                className={classNames(
                                  isActive
                                    ? 'bg-[#35c8dc] text-white'
                                    : 'text-gray-700 hover:bg-gray-100',
                                  'block px-4 py-2 text-sm transition-colors duration-200'
                                )}
                                onClick={() => setIsUserMenuOpen(false)}
                              >
                                {item.name}
                              </Link>
                            )
                          })
                        ) : (
                          menuItems.map((item) => {
                            const isActive = pathname === item.href
                            return (
                              <Link
                                key={item.name}
                                href={item.href}
                                className={classNames(
                                  isActive
                                    ? 'bg-[#35c8dc] text-white'
                                    : 'text-gray-700 hover:bg-gray-100',
                                  'block px-4 py-2 text-sm transition-colors duration-200'
                                )}
                                onClick={() => setIsUserMenuOpen(false)}
                              >
                                {item.name}
                              </Link>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>

                  <div className="sm:hidden">
                    <Disclosure.Button
                      className="inline-flex items-center justify-center rounded-md p-2 text-gray-900 hover:text-black hover:bg-gray-100 cursor-pointer"
                      suppressHydrationWarning
                    >
                      <span className="sr-only">Open main menu</span>
                      {open ? (
                        <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                      ) : (
                        <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                      )}
                    </Disclosure.Button>
                  </div>
                </div>
              </div>
            </div>

            <Disclosure.Panel
              className="sm:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-40 transition-all duration-300 ease-in-out"
              static={false}
            >
              <div className="space-y-1 px-2 pt-2 pb-3">
                {navigation.map((item) => {
                  const isProducts = item.name === 'Products'
                  const finalHref =
                    isProducts && !isLoggedIn ? '/login/?redirect_to=products' : item.href

                  const isActive = pathname === finalHref

                  return (
                    <Disclosure.Button
                      key={item.name}
                      as={Link}
                      href={finalHref}
                      className={classNames(
                        isActive
                          ? 'text-[#35c8dc]'
                          : 'text-black hover:text-[#35c8dc]',
                        'block rounded-md px-3 py-2 text-base font-medium transition-colors duration-300 ease-in-out'
                      )}
                    >
                      {item.name}
                    </Disclosure.Button>
                  )
                })}
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>

      {/* Cart Drawer */}
      <Drawer
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="text-[#35c8dc]" size={20} />
              <span className="text-lg font-semibold">Your Cart</span>
              {cartCount > 0 && (
                <span className="bg-[#35c8dc] text-white text-xs px-2 py-1 rounded-full">
                  {cartCount} {cartCount === 1 ? 'item' : 'items'}
                </span>
              )}
            </div>
            {cartItems.length > 0 && (
              <button
                onClick={handleClearCart}
                disabled={cartUpdating}
                className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cartUpdating ? 'Clearing...' : 'Clear All'}
              </button>
            )}
          </div>
        }
        placement="right"
        onClose={() => setIsCartDrawerOpen(false)}
        open={isCartDrawerOpen}
        size={400}
        className="cart-drawer"
      >
        {cartLoading ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#35c8dc]"></div>
            <p className="mt-4 text-gray-500">Loading cart...</p>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <ShoppingCart className="text-gray-300 mb-4" size={64} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-gray-500 text-center mb-6">
              Looks like you haven't added any products to your cart yet.
            </p>
            <button
              onClick={handleContinueShopping}
              className="px-6 py-2 bg-[#35c8dc] text-white rounded-md font-medium hover:bg-[#2db4c8] transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto">
              {cartItems.map((item) => {
                const stockQuantity = getItemStockQuantity(item);
                const productName = item.product?.product_name || 'Unknown Product';
                const sku = item.product?.sku || 'N/A';
                const thumbnail = item.product?.thumbnail;
                const price = item.product?.price || 0;
                const productSlug = item.product?.slug || '';

                return (
                  <div key={item.id} className="border-b border-gray-200 py-4">
                    <div className="flex items-start space-x-3">
                      {/* Product Image */}
                      <div className="w-15 h-15 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={productName}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <ShoppingCart className="text-gray-400" size={24} />
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate hover:text-[#35c8dc] cursor-pointer"
                          onClick={() => productSlug && router.push(`/product/${productSlug}`)}>
                          {productName}
                        </h4>
                        <p className="text-xs text-gray-500">SKU: {sku}</p>
                        <div className="flex items-center justify-between mt-2">
                          {/* Quantity Controls */}
                          {/* <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                              disabled={cartUpdating}
                              className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              -
                            </button>
                            <span className="text-sm font-medium">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                              disabled={cartUpdating || item.quantity >= stockQuantity}
                              className={`w-6 h-6 flex items-center justify-center border border-gray-300 rounded ${item.quantity >= stockQuantity || cartUpdating
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:bg-gray-100'
                                }`}
                            >
                              +
                            </button>
                          </div> */}
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveFromCart(item.product_id)}
                        disabled={cartUpdating}
                        className="text-gray-400 hover:text-red-500 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Stock Status */}
                    {item.quantity >= stockQuantity && stockQuantity > 0 && (
                      <p className="text-xs text-red-500 mt-2">
                        Only {stockQuantity} items in stock
                      </p>
                    )}
                    {stockQuantity === 0 && (
                      <p className="text-xs text-red-500 mt-2">
                        Out of stock
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cart Summary */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="space-y-3">
                <button
                  onClick={handleCart}
                  className="w-full py-2 border-2 cursor-pointer border-[#35c8dc] text-[#35c8dc] font-bold hover:bg-gray-50 transition-colors"
                >
                  View Cart
                </button>
                <button
                  onClick={handleCheckout}
                  className="w-full py-3 cursor-pointer bg-[#35c8dc] text-white font-medium hover:bg-[#2db4c8] transition-colors"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Mobile Search Drawer */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-60 bg-white bg-opacity-50">
          <div className="fixed inset-0 flex items-start justify-center pt-20">
            <div className="bg-white w-full max-w-md mx-4 rounded-lg shadow-lg">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Search</h3>
                  <button
                    onClick={() => setIsMobileSearchOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <IoIosClose size={24} />
                  </button>
                </div>

                <form onSubmit={handleSearchSubmit}>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex-1 flex items-center border border-gray-300 rounded-lg px-3 py-2">
                      <Search className="text-gray-400 mr-2" size={20} />
                      <input
                        id="mobile-search-input"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search products..."
                        className="flex-1 border-0 focus:ring-0 focus:outline-none text-base"
                        autoFocus
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="text-gray-400 hover:text-gray-600 ml-2"
                        >
                          <IoIosClose size={20} />
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="py-2 px-3 bg-[#35c8dc] text-white rounded-lg text-base font-medium hover:bg-[#2db4c8] transition-colors"
                    >
                      Search
                    </button>
                  </div>

                  {/* Mobile Search Results */}
                  {(searchQuery.trim() && (isSearching || searchResults.length > 0)) && (
                    <div className="border-t border-gray-100 pt-2 mt-2">
                      {isSearching ? (
                        <div className="py-3 text-center text-gray-500 text-sm">
                          Searching...
                        </div>
                      ) : searchResults.length > 0 ? (
                        <>
                          <div className="space-y-2 max-h-72 overflow-y-auto">
                            {searchResults.slice(0, 4).map((product) => (
                              <button
                                key={product.id}
                                onClick={() => handleProductClick(product.slug)}
                                className="w-full text-left p-3 hover:bg-gray-50 rounded-md transition-colors flex items-start space-x-3 group"
                              >
                                {product.thumbnail ? (
                                  <img
                                    src={product.thumbnail}
                                    alt={product.product_name}
                                    className="w-10 h-10 object-contain"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-gray-100 flex items-center justify-center rounded">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#35c8dc]">
                                    {product.product_name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    SKU: {product.sku}
                                  </p>
                                  <div className="flex items-center space-x-2 mt-1">
                                    {product.stock_quantity === 0 && (
                                      <span className="text-xs text-red-500 font-medium">
                                        Out of stock
                                      </span>
                                    )}
                                    {product.post_status !== 'Publish' && (
                                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                        Private
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>

                          {/* See All Products Link - Mobile */}
                          {totalProducts > 4 && (
                            <div className="border-t border-gray-100 pt-2 mt-2">
                              <button
                                onClick={handleSeeAllClick}
                                className="w-full text-center cursor-pointer text-sm text-[#35c8dc] hover:text-[#2db4c8] font-medium py-2"
                              >
                                See all {totalProducts} products
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="py-3 text-center text-gray-500 text-sm">
                          No products found
                        </div>
                      )}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}