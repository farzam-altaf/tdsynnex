'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Disclosure } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { IoIosSearch, IoIosClose } from 'react-icons/io'
import { CiCircleChevDown, CiSearch, CiUser } from 'react-icons/ci'
import { IoCartOutline } from 'react-icons/io5'
import { Badge, Drawer } from 'antd'
import { Bell, Search, ShoppingCart, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext' // Add this import
import { PiBellLight, PiShoppingCartThin } from "react-icons/pi";

// Add at the top with other role constants
const shopManager = process.env.NEXT_PUBLIC_SHOPMANAGER;
const admin = process.env.NEXT_PUBLIC_ADMINISTRATOR;
const superSubscriber = process.env.NEXT_PUBLIC_SUPERSUBSCRIBER;
const subscriber = process.env.NEXT_PUBLIC_SUBSCRIBER;

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
  { name: 'My Orders', href: '/order-details' },
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
  const [pendingUserCount, setPendingUserCount] = useState(0);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
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

  const fetchNotificationCounts = useCallback(async () => {
    if (!profile?.role || (profile.role !== admin && profile.role !== shopManager)) {
      return;
    }

    try {
      // Fetch pending user approvals (isVerified = false)
      const { count: userCount, error: userError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('isVerified', false);

      if (!userError) {
        setPendingUserCount(userCount || 0);
      }

      // Fetch pending orders (awaiting approval)
      const { count: orderCount, error: orderError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('order_status', process.env.NEXT_PUBLIC_STATUS_AWAITING);

      if (!orderError) {
        setPendingOrderCount(orderCount || 0);
      }
    } catch (error) {
    }
  }, [profile?.role]);

  // Navbar میں یہ state variable اضافہ کریں (دیگر state variables کے ساتھ):
  const [quantityInputValues, setQuantityInputValues] = useState<Record<string, string>>({});
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Quantity input change handler
  const handleQuantityInputChange = (productId: string, value: string) => {
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setQuantityInputValues(prev => ({
        ...prev,
        [productId]: value
      }));

      // Set this product as being edited
      if (value !== cartItems.find(item => item.product_id === productId)?.quantity.toString()) {
        setEditingProductId(productId);
      } else {
        setEditingProductId(null);
      }
    }
  };

  // Save quantity handler
  const handleSaveQuantity = async (productId: string) => {
    const inputValue = quantityInputValues[productId];
    if (!inputValue || inputValue.trim() === '') return;

    const numericValue = parseInt(inputValue);
    if (isNaN(numericValue) || numericValue < 1) return;

    try {
      await handleUpdateQuantity(productId, numericValue);
      setEditingProductId(null);
    } catch (error) {
      // Revert to original value on error
      const currentItem = cartItems.find(item => item.product_id === productId);
      if (currentItem) {
        setQuantityInputValues(prev => ({
          ...prev,
          [productId]: currentItem.quantity.toString()
        }));
      }
    }
  };

  // Cancel editing handler
  const handleCancelEdit = (productId: string) => {
    const currentItem = cartItems.find(item => item.product_id === productId);
    if (currentItem) {
      setQuantityInputValues(prev => ({
        ...prev,
        [productId]: currentItem.quantity.toString()
      }));
    }
    setEditingProductId(null);
  };

  // Cart drawer کھلتے ہی initial values set کریں
  useEffect(() => {
    if (isCartDrawerOpen && cartItems.length > 0) {
      const initialValues: Record<string, string> = {};
      cartItems.forEach(item => {
        initialValues[item.product_id] = item.quantity.toString();
      });
      setQuantityInputValues(initialValues);
    }
  }, [isCartDrawerOpen, cartItems]);

  // Cart drawer بند ہونے پر reset کریں
  useEffect(() => {
    if (!isCartDrawerOpen) {
      setEditingProductId(null);
    }
  }, [isCartDrawerOpen]);

  // Add useEffect to fetch counts
  useEffect(() => {
    if (!loading && profile?.role && (profile.role === admin || profile.role === shopManager)) {
      fetchNotificationCounts();

      // Refresh counts every 30 seconds
      const interval = setInterval(fetchNotificationCounts, 30000);
      return () => clearInterval(interval);
    }
  }, [loading, profile?.role, fetchNotificationCounts]);

  // Add click outside handler for notification dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Calculate total count
  const totalNotificationCount = pendingUserCount + pendingOrderCount;

  // Add this function to handle notification click
  const handleNotificationClick = () => {
    setIsNotificationOpen(!isNotificationOpen);
  };


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
    }
  }

  // Handle quantity update
  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    try {
      // Get current item to check stock
      const cartItem = cartItems.find(item => item.product_id === productId);
      if (!cartItem) return;

      const stockQuantity = cartItem.product?.stock_quantity || 0;

      // Validate quantity
      if (newQuantity < 1) {
        newQuantity = 1;
      }

      if (stockQuantity > 0 && newQuantity > stockQuantity) {
        newQuantity = stockQuantity;
      }

      await updateQuantity(productId, newQuantity);

      // Show success message only for significant changes

    } catch (error) {
    }
  };

  // Handle clear cart
  const handleClearCart = async () => {
    try {
      await clearCart()
    } catch (error) {
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
        setSearchResults([])
        setTotalProducts(0)
      } else {
        setSearchResults(products || [])
        setTotalProducts(count || 0)
      }
    } catch (error) {
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
    profile && (profile.role === admin || profile.role === superSubscriber);

  // Replace the existing navigation logic with this:

  const navigation = !loading && isLoggedIn
    ? [
      ...publicNavigation,
      // Add 'Report a Win' for all logged in users EXCEPT shopManager
      ...(profile?.role !== superSubscriber ? [{ name: 'Report a Win', href: '/wins' }] : []),
      // Add '360Dashboard' only for admin and superSubscriber
      ...((profile?.role === admin || profile?.role === shopManager)
        ? [{ name: '360Dashboard', href: '/360dashboard' }]
        : [])
    ]
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

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && editingProductId) {
      handleCancelEdit(editingProductId);
    }
  }, [editingProductId]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

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
                  {(isLoggedIn && (profile?.role === admin || profile?.role === shopManager)) && (
                    <div className="hidden lg:block relative" ref={notificationRef}>
                      <button
                        type="button"
                        onClick={handleNotificationClick}
                        className="relative rounded-full p-1 text-black cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                      >
                        <span className="sr-only">Notifications</span>
                        <Badge
                          count={totalNotificationCount}
                          size="small"
                          overflowCount={99}
                          showZero={false}
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
                          <PiBellLight size={22} />
                        </Badge>
                      </button>

                      {/* Notification Dropdown */}
                      {isNotificationOpen && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                          <div className="p-2">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Notifications</h3>

                            {/* User Approvals */}
                            <button
                              onClick={() => {
                                router.push('/users-list?_=true');
                                setIsNotificationOpen(false);
                              }}
                              className="w-full text-left mb-2 py-3 px-2 rounded-md hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <CiUser className="text-blue-600" size={16} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">User Approvals</p>
                                    <p className="text-xs text-gray-500">Pending user verifications</p>
                                  </div>
                                </div>
                                {pendingUserCount > 0 && (
                                  <Badge
                                    count={pendingUserCount}
                                    size="small"
                                    style={{
                                      backgroundColor: '#ef4444',
                                      fontSize: '10px',
                                      height: '18px',
                                      minWidth: '18px',
                                      lineHeight: '18px'
                                    }}
                                  />
                                )}
                              </div>
                            </button>

                            {/* Order Approvals */}
                            <button
                              onClick={() => {
                                router.push('/order-details');
                                setIsNotificationOpen(false);
                              }}
                              className="w-full text-left py-3 px-2 rounded-md hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">Awaiting Approvals</p>
                                    <p className="text-xs text-gray-500">Pending order approvals</p>
                                  </div>
                                </div>
                                {pendingOrderCount > 0 && (
                                  <Badge
                                    count={pendingOrderCount}
                                    size="small"
                                    style={{
                                      backgroundColor: '#ef4444',
                                      fontSize: '10px',
                                      height: '18px',
                                      minWidth: '18px',
                                      lineHeight: '18px'
                                    }}
                                  />
                                )}
                              </div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Desktop Search Button and Dropdown */}
                  {isLoggedIn && (
                    <div className="hidden sm:block relative" ref={searchRef}>
                      <button
                        type="button"
                        className="relative rounded-full p-1 text-black cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                      >
                        <span className="sr-only">Search</span>
                        <CiSearch size={22} />
                      </button>

                      {isSearchOpen && (
                        <div className="absolute right-0 top-full mt-2 w-125 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
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
                                      {searchResults.filter(product => product.post_status === 'Publish').slice(0, 4).map((product) => (
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
                  )}

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
                        <PiShoppingCartThin size={26} />
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
                      <CiSearch size={22} />
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
                    isProducts && !isLoggedIn ? '/login/?redirect_to=product-category/alldevices' : item.href

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
              <PiShoppingCartThin className="text-[#35c8dc]" size={20} />
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
                className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <PiShoppingCartThin className="text-gray-300 mb-4" size={64} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-gray-500 text-center mb-6">
              Looks like you haven't added any products to your cart yet.
            </p>
            <button
              onClick={handleContinueShopping}
              className="px-6 py-2 bg-[#35c8dc] text-white rounded-md hover:bg-[#2db4c8] transition-colors cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto pr-2">
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
                      <div
                        className="w-15 h-15 bg-gray-100 rounded-md flex items-center justify-center shrink-0 cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => productSlug && router.push(`/product/${productSlug}`)}
                      >
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={productName}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <PiShoppingCartThin className="text-gray-400" size={24} />
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h4
                          className="text-sm font-medium text-gray-900 truncate hover:text-[#35c8dc] cursor-pointer transition-colors"
                          onClick={() => productSlug && router.push(`/product/${productSlug}`)}
                        >
                          {productName}
                        </h4>
                        <p className="text-xs text-gray-500">SKU: {sku}</p>

                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-2 mt-3">
                          {/* Minus Button - Always show */}
                          <button
                            onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                            disabled={cartUpdating || item.quantity <= 1}
                            className={`w-7 h-7 flex items-center justify-center border border-gray-300 rounded-md transition-colors
      ${cartUpdating || item.quantity <= 1
                                ? 'opacity-50 cursor-not-allowed text-gray-400'
                                : 'hover:bg-gray-100 hover:border-gray-400 text-gray-700'
                              }`}
                          >
                            −
                          </button>

                          {/* Quantity Input Field with Save/Cancel buttons */}
                          <div className="relative">
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="1"
                                max={stockQuantity}
                                value={quantityInputValues[item.product_id] !== undefined
                                  ? quantityInputValues[item.product_id]
                                  : item.quantity.toString()}
                                onChange={(e) => handleQuantityInputChange(item.product_id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveQuantity(item.product_id);
                                  }
                                }}
                                disabled={cartUpdating}
                                className="w-16 text-center border border-gray-300 rounded-md py-1.5 px-2 text-sm 
          focus:outline-none focus:ring-1 focus:ring-[#35c8dc] focus:border-[#35c8dc]
          disabled:opacity-50 disabled:cursor-not-allowed
          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
          transition-all duration-200"
                              />

                              {/* Save Button - Only show when editing this product */}
                              {editingProductId === item.product_id && (
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => handleSaveQuantity(item.product_id)}
                                    disabled={cartUpdating}
                                    className="w-7 h-7 flex items-center justify-center bg-[#35c8dc] text-white rounded-md hover:bg-[#2db4c8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Save quantity"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleCancelEdit(item.product_id)}
                                    disabled={cartUpdating}
                                    className="w-7 h-7 flex items-center justify-center bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Cancel"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Stock limit warning */}
                            {stockQuantity > 0 &&
                              parseInt(quantityInputValues[item.product_id] || item.quantity.toString()) > stockQuantity && (
                                <div className="absolute -bottom-5 left-0 right-0 text-xs text-red-500 font-medium text-center">
                                  Max: {stockQuantity}
                                </div>
                              )}
                          </div>

                          {/* Plus Button - Always show */}
                          <button
                            onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                            disabled={cartUpdating || item.quantity >= stockQuantity}
                            className={`w-7 h-7 flex items-center justify-center border border-gray-300 rounded-md transition-colors
      ${cartUpdating || item.quantity >= stockQuantity
                                ? 'opacity-50 cursor-not-allowed text-gray-400'
                                : 'hover:bg-gray-100 hover:border-gray-400 text-gray-700'
                              }`}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Price and Remove Button */}
                      <div className="flex flex-col items-end space-y-2">
                        <button
                          onClick={() => handleRemoveFromCart(item.product_id)}
                          disabled={cartUpdating}
                          className="text-gray-400 hover:text-red-500 p-1 transition-colors 
                      disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={16} />
                        </button>
                        {price > 0 && (
                          <p className="text-sm font-medium text-gray-900">
                            ${(price * item.quantity).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stock Status Messages */}
                    <div className="mt-2 space-y-1">
                      {stockQuantity === 0 && (
                        <div className="flex items-center space-x-1 text-xs">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-red-600 font-medium">Out of stock</span>
                        </div>
                      )}

                      {stockQuantity > 0 && item.quantity >= stockQuantity && (
                        <div className="flex items-center space-x-1 text-xs">
                          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                          <span className="text-amber-600 font-medium">
                            Only {stockQuantity} {stockQuantity === 1 ? 'item' : 'items'} in stock
                          </span>
                        </div>
                      )}

                      {stockQuantity > 0 && item.quantity < stockQuantity && stockQuantity < 10 && (
                        <div className="flex items-center space-x-1 text-xs">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-green-600">
                            {stockQuantity} {stockQuantity === 1 ? 'item' : 'items'} left in stock
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cart Summary */}
            <div className="border-t border-gray-200 pt-4 mt-4">

              <div className="space-y-3">
                <button
                  onClick={handleCart}
                  className="w-full py-2.5 border-2 cursor-pointer border-[#35c8dc] text-[#35c8dc] font-medium hover:bg-gray-50 transition-colors rounded-md"
                >
                  View Cart Details
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={cartUpdating}
                  className="w-full py-3 cursor-pointer bg-[#35c8dc] text-white font-medium hover:bg-[#2db4c8] transition-colors rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cartUpdating ? 'Processing...' : 'Proceed to Checkout'}
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
                            {(() => {
                              // ✅ Filter only published products
                              const publishedProducts = searchResults.filter(product => product.post_status === 'Publish');
                              const productsToShow = publishedProducts.slice(0, 4);

                              if (productsToShow.length === 0) {
                                return (
                                  <div className="text-center py-4">
                                    <p className="text-gray-500 text-sm">No published products found</p>
                                  </div>
                                );
                              }

                              return productsToShow.map((product) => (
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
                                    </div>
                                  </div>
                                </button>
                              ));
                            })()}
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