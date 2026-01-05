'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Disclosure } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { IoIosSearch } from 'react-icons/io'
import { CiCircleChevDown, CiUser } from 'react-icons/ci'
import { IoCartOutline } from 'react-icons/io5'
import { Badge } from 'antd'
import { Bell } from 'lucide-react'

type NavigationItem = { name: string; href: string }

const publicNavigation: NavigationItem[] = [
  { name: 'Home', href: '/' },
  { name: 'How it Works', href: '/how-it-works' },
  { name: 'Products', href: '/product-category/alldevices' },
]

const authNavigation: NavigationItem[] = [
  { name: 'Report a Win', href: '/wins' },
  { name: '360Dashboard', href: '/dashboard' },
]

const menuItems = [
  { name: 'Register', href: '/account-registration' },
  { name: 'Login', href: '/login' },
]

const authMenuItems = [
  { name: 'Password reset', href: '/password-reset' },
  { name: 'Logout', href: 'logout' },
]

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const userMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)


  const router = useRouter()

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

  const navigation = isLoggedIn
    ? [...publicNavigation, ...authNavigation]
    : publicNavigation

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

  return (
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
                      isProducts && !isLoggedIn ? '/login/?redirect_to=products' : item.href

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
                <button
                  type="button"
                  className="relative rounded-full p-1 text-black cursor-pointer"
                >
                  <span className="sr-only">Search</span>
                  <IoIosSearch size={22} />
                </button>

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

                          // ✅ LOGOUT ITEM
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

                          // ✅ NORMAL LINK
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

                <button
                  type="button"
                  className="relative rounded-full p-1 text-black cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                >
                  <span className="sr-only">Cart</span>
                  <Badge
                    count={cartCount}
                    size="small"
                    overflowCount={99}
                    showZero={true}
                    style={{
                      backgroundColor: '#ef4444', // Red color
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
                          // ✅ LOGOUT CASE
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

                          // ✅ NORMAL LINK
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

                const isActive = pathname === finalHref   // ✅ FIX HERE

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
  )
}