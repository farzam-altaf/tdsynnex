"use client";

import { useEffect, useState } from "react";
import { Filter, X, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Drawer, Skeleton } from "antd";
import { FaFilter } from "react-icons/fa";
import { supabase } from "@/lib/supabase/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { FaPlus } from "react-icons/fa6";
import { useCart } from "@/app/context/CartContext";
import { toast } from "sonner";
import { logActivity } from "@/lib/logger";
import { PiShoppingCartThin } from "react-icons/pi";

// Hardcoded filters (not from database)
const HARDCODED_FILTERS = {
    copilotPC: ["Yes"],
    fiveGEnabled: ["Yes"],
};

// Get all filter keys
const HARDCODED_FILTER_KEYS = Object.keys(HARDCODED_FILTERS);

// Interface for product from database
interface Product {
    id: string;
    product_name: string;
    slug: string;
    sku: string;
    form_factor: string;
    processor: string;
    memory: string;
    storage: string;
    screen_size: string;
    technologies: string;
    inventory_type: string;
    total_inventory: number;
    stock_quantity: number;
    date: string;
    copilot: boolean;
    five_g_Enabled: boolean;
    post_status: string;
    description: string;
    isBundle: boolean;
    thumbnail: string;
    gallery: string[];
    user_id: string;
    created_at: string;
}

// Map URL filter parameters to database columns
const URL_TO_DB_MAPPING: Record<string, string> = {
    'form_factor': 'form_factor',
    'processor': 'processor',
    'screen_size': 'screen_size',
    'memory': 'memory',
    'storage': 'storage',
    'copilot': 'copilot',
    'five_g': 'five_g_Enabled',
};

// Map URL filter parameters to filter keys (for UI)
const URL_FILTER_MAPPING: Record<string, string> = {
    'form_factor': 'formFactor',
    'processor': 'processor',
    'screen_size': 'screenSize',
    'memory': 'memory',
    'storage': 'storage',
    'copilot': 'copilotPC',
    'five_g': 'fiveGEnabled',
};

// Skeleton component for products grid
const ProductsGridSkeleton = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };

        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);
        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    return (
        <div className="w-full lg:max-w-7xl lg:mx-auto lg:px-6">
            <div className="flex items-center justify-between sm:my-10 my-1">
                <div className="text-3xl font-semibold">Devices</div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-10">
                {[...Array(8)].map((_, index) => (
                    <div key={index} className="bg-white border border-gray-300 sm:py-5 p-3">
                        <Skeleton.Image
                            active
                            style={{
                                width: isMobile ? "135px" : "225px",
                                height: isMobile ? "100px" : "192px",
                                marginBottom: "16px",
                            }}
                        />
                        <div className="space-y-2">
                            <Skeleton active paragraph={{ rows: 2 }} />
                            <Skeleton active paragraph={{ rows: 1, width: '80%' }} />
                            <Skeleton.Button active size="default" style={{ width: '100%' }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Skeleton component for filters sidebar
const FiltersSidebarSkeleton = () => (
    <div className="p-6 space-y-4">
        {[...Array(7)].map((_, index) => (
            <div key={index} className="border-b pb-4">
                <Skeleton active paragraph={{ rows: 0 }} />
                <div className="mt-3 space-y-2 overflow-hidden">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton active paragraph={{ rows: 0 }} style={{ width: 300 }} key={i} />
                    ))}
                </div>
            </div>
        ))}
    </div>
);

export default function Page() {
    const router = useRouter();
    const { profile, isLoggedIn, loading, user } = useAuth();
    const admin = process.env.NEXT_PUBLIC_ADMINISTRATOR;
    const shopManager = process.env.NEXT_PUBLIC_SHOPMANAGER;
    const superSubscriber = process.env.NEXT_PUBLIC_SUPERSUBSCRIBER;
    const subscriber = process.env.NEXT_PUBLIC_SUBSCRIBER;
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const source = `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}${pathname}`;

    const {
        addToCart,
        removeFromCart,
        isUpdating,
        addingProductId,
        isLoading: cartLoading,
        isUpdating: cartUpdating,
        isInCart,
        cartItems,
        cartCount,
        clearCart,
    } = useCart()

    // Extract the last part of the path
    const slug = pathname.split('/').pop() || '';

    // State for filter options from products table
    const [filterOptions, setFilterOptions] = useState<Record<string, string[]>>({});
    // State for products
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const q = searchParams.get("q");
    
    // Combined filters state
    const [filters, setFilters] = useState<Record<string, string[]>>({
        formFactor: [],
        processor: [],
        screenSize: [],
        memory: [],
        storage: [],
        copilotPC: [],
        fiveGEnabled: [],
    });

    const [showFilters, setShowFilters] = useState(false);
    // Set all filters to be open by default
    const [openFilters, setOpenFilters] = useState<string[]>([]);
    const [authChecked, setAuthChecked] = useState(false);
    const [authInitialized, setAuthInitialized] = useState(false);
    const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
    const [showCartDrawer, setShowCartDrawer] = useState(false);

    // Function to extract filters from URL
    const getFiltersFromURL = () => {
        const urlFilters: Record<string, string[]> = {};
        
        // Iterate through all search params
        searchParams.forEach((value, key) => {
            // Skip non-filter parameters
            if (key === 'q' || key === 'page' || key === '_') return;
            
            // Map URL parameter to filter key
            const filterKey = URL_FILTER_MAPPING[key];
            if (filterKey) {
                // Handle multiple values for same filter (comma-separated)
                const values = value.split(',').map(v => v.trim());
                urlFilters[filterKey] = values;
            }
        });
        
        return urlFilters;
    };

    // Update URL when filters change
    const updateURLWithFilters = (newFilters: Record<string, string[]>) => {
        const params = new URLSearchParams(searchParams.toString());
        
        // Remove all existing filter parameters
        Object.keys(URL_FILTER_MAPPING).forEach(key => {
            params.delete(key);
        });
        
        // Add new filter parameters
        Object.entries(newFilters).forEach(([filterKey, values]) => {
            if (values.length > 0) {
                // Find the URL parameter key for this filter
                const urlKey = Object.keys(URL_FILTER_MAPPING).find(
                    key => URL_FILTER_MAPPING[key] === filterKey
                );
                
                if (urlKey) {
                    // Join multiple values with comma
                    params.set(urlKey, values.join(','));
                }
            }
        });
        
        // Preserve existing query parameters like 'q'
        const queryString = params.toString();
        const newUrl = queryString 
            ? `${pathname}?${queryString}`
            : pathname;
        
        router.replace(newUrl, { scroll: false });
    };

    // Handle clear cart
    const handleClearCart = async () => {
        try {
            await clearCart()
        } catch (error) {
        }
    }

    const handleAddToCart = async (productId: string) => {
        try {
            const product = products.find(p => p.id === productId);

            await logActivity({
                type: 'product',
                level: 'info',
                action: 'add_to_cart_attempt',
                message: `User attempted to add product to cart: ${product?.product_name || 'Unknown product'}`,
                userId: user?.id || null,
                productId: productId,
                details: {
                    productName: product?.product_name,
                    sku: product?.sku,
                    userRole: profile?.role,
                    isPublished: product?.post_status === 'Publish',
                    stockQuantity: product?.stock_quantity
                }
            });

            await addToCart(productId, 1);

            await logActivity({
                type: 'product',
                level: 'success',
                action: 'add_to_cart_success',
                message: `Product added to cart successfully: ${product?.product_name || 'Unknown product'}`,
                userId: user?.id || null,
                productId: productId,
                details: {
                    productName: product?.product_name,
                    sku: product?.sku
                },
                status: 'completed'
            });

            setShowCartDrawer(true);

        } catch (error: any) {
            let errorMessage = 'Failed to add product to cart. Please try again.';

            await logActivity({
                type: 'product',
                level: 'error',
                action: 'add_to_cart_failed',
                message: `Failed to add product to cart: ${error?.message || 'Unknown error'}`,
                userId: user?.id || null,
                productId: productId,
                details: {
                    errorCode: error?.code,
                    errorMessage: error?.message,
                    errorDetails: error
                },
                status: 'failed'
            });

            if (error?.code === '23505') {
                errorMessage = 'This product is already in your cart.';
            } else if (error?.code === '23503') {
                errorMessage = 'Product not found.';
            } else if (error?.message?.includes('foreign key constraint')) {
                errorMessage = 'Invalid product. Please refresh the page and try again.';
            }

            toast.error(errorMessage, {
                style: { background: "red", color: "white" },
            });
        }
    };

    // Get stock quantity for a cart item
    const getItemStockQuantity = (cartItem: any) => {
        return cartItem.product?.stock_quantity || 0;
    };

    const handleCart = () => {
        router.replace('/cart');
        setIsCartDrawerOpen(false);
    };

    const handleCheckout = () => {
        router.push('/checkout');
        setIsCartDrawerOpen(false);
    };

    const handleContinueShopping = () => {
        setIsCartDrawerOpen(false);
        router.push('/product-category/alldevices');
    };

    // Handle cart item removal
    const handleRemoveFromCart = async (productId: string) => {
        const product = products.find(p => p.id === productId);

        await logActivity({
            type: 'product',
            level: 'info',
            action: 'remove_from_cart_attempt',
            message: `User attempted to remove product from cart: ${product?.product_name || 'Unknown product'}`,
            userId: user?.id || null,
            productId: productId,
            details: {
                productName: product?.product_name,
                sku: product?.sku,
                slug: product?.slug,
                categorySlug: slug
            }
        });

        try {
            await removeFromCart(productId);

            await logActivity({
                type: 'product',
                level: 'success',
                action: 'remove_from_cart_success',
                message: `Product removed from cart successfully: ${product?.product_name || 'Unknown product'}`,
                userId: user?.id || null,
                productId: productId,
                details: {
                    productName: product?.product_name,
                    sku: product?.sku,
                    slug: product?.slug,
                    categorySlug: slug
                },
                status: 'completed'
            });

        } catch (error) {
            await logActivity({
                type: 'product',
                level: 'error',
                action: 'remove_from_cart_failed',
                message: `Failed to remove product from cart`,
                userId: user?.id || null,
                productId: productId,
                details: {
                    errorDetails: error
                },
                status: 'failed'
            });
        }
    }

    const checkIfInCart = (productId: string): boolean => {
        return isInCart(productId)
    }

    // Handle auth check
    useEffect(() => {
        if (loading) {
            return;
        }

        setAuthInitialized(true);

        if (!isLoggedIn || profile?.isVerified === false && !profile) {
            router.replace(`/login/?redirect_to=product-category/${slug}`);
        } else {
            setAuthChecked(true);
        }
    }, [loading, isLoggedIn, profile, user, router]);

    // Fetch data only after auth is confirmed AND initialized
    useEffect(() => {
        if (!authChecked || !authInitialized) {
            return;
        }

        fetchDataFromDatabase();
    }, [authChecked, authInitialized, searchParams]); // Add searchParams as dependency

    // Function to fetch products based on slug and URL filters
    const fetchProductsBySlug = async (categorySlug: string) => {
        const startTime = Date.now();

        await logActivity({
            type: 'product',
            level: 'info',
            action: 'category_products_fetch_attempt',
            message: `Attempting to fetch products for category: ${categorySlug}`,
            userId: user?.id || null,
            details: {
                categorySlug: categorySlug,
                userRole: profile?.role,
                isLoggedIn: isLoggedIn
            }
        });

        try {
            const decodedSlug = decodeURIComponent(categorySlug).toLowerCase();

            let productsQuery = supabase
                .from("products")
                .select("*")
                .order("date", { ascending: false });

            // Apply URL filters to the database query
            let hasFilters = false;
            
            searchParams.forEach((value, key) => {
                // Skip non-filter parameters
                if (key === 'q' || key === 'page' || key === '_') return;
                
                const dbColumn = URL_TO_DB_MAPPING[key];
                if (dbColumn) {
                    const values = value.split(',').map(v => v.trim());
                    
                    if (values.length === 1) {
                        // Single value - use eq
                        productsQuery = productsQuery.eq(dbColumn, values[0]);
                        hasFilters = true;
                    } else if (values.length > 1) {
                        // Multiple values - use in
                        productsQuery = productsQuery.in(dbColumn, values);
                        hasFilters = true;
                    }
                }
            });

            // If no filters, search by product name or SKU
            if (!hasFilters) {
                productsQuery = productsQuery.or(`product_name.ilike.%${decodedSlug}%,sku.ilike.%${decodedSlug}%`);
            }

            const { data: productsData, error: productsError } = await productsQuery;

            if (productsError) {
                await logActivity({
                    type: 'product',
                    level: 'error',
                    action: 'category_products_fetch_failed',
                    message: `Failed to fetch products for category: ${categorySlug}`,
                    userId: user?.id || null,
                    details: {
                        categorySlug: categorySlug,
                        error: productsError,
                        executionTimeMs: Date.now() - startTime
                    },
                    status: 'failed'
                });
                return [];
            } else {
                if (productsData && productsData.length > 0) {
                    await logActivity({
                        type: 'product',
                        level: 'success',
                        action: 'category_products_fetch_success',
                        message: `Successfully fetched ${productsData.length} products for category: ${categorySlug}`,
                        userId: user?.id || null,
                        details: {
                            categorySlug: categorySlug,
                            totalProducts: productsData.length,
                            publishedProducts: productsData.filter(p => p.post_status === 'Publish').length,
                            outOfStockProducts: productsData.filter(p => p.stock_quantity === 0).length,
                            executionTimeMs: Date.now() - startTime
                        },
                        status: 'completed'
                    });

                    return productsData;
                } else {
                    await logActivity({
                        type: 'product',
                        level: 'info',
                        action: 'category_no_products_found',
                        message: `No products found for category: ${categorySlug}`,
                        userId: user?.id || null,
                        details: {
                            categorySlug: categorySlug,
                            executionTimeMs: Date.now() - startTime
                        },
                        status: 'completed'
                    });

                    return [];
                }
            }

        } catch (error) {
            await logActivity({
                type: 'product',
                level: 'error',
                action: 'category_products_fetch_error',
                message: `Unexpected error while fetching products for category: ${categorySlug}`,
                userId: user?.id || null,
                details: {
                    categorySlug: categorySlug,
                    error: error,
                    executionTimeMs: Date.now() - startTime
                },
                status: 'failed'
            });

            return [];
        }
    };

    // Extract unique filter options from products data
    const extractUniqueValues = (key: keyof Product, productsData: Product[]): string[] => {
        const values = productsData
            .map(product => product[key])
            .filter(value =>
                value !== null &&
                value !== undefined &&
                value !== '' &&
                (typeof value === 'string' ? value.trim() !== '' : true)
            );

        return [...new Set(values.map(v => v.toString()))].sort();
    };

    // Update filter options based on products
    const updateFilterOptions = (productsData: Product[]) => {
        const filterOptionsMap = {
            formFactor: extractUniqueValues('form_factor', productsData),
            processor: extractUniqueValues('processor', productsData),
            memory: extractUniqueValues('memory', productsData),
            storage: extractUniqueValues('storage', productsData),
            screenSize: extractUniqueValues('screen_size', productsData),
        };

        setFilterOptions(filterOptionsMap);
    };

    // Fetch all data from database
    const fetchDataFromDatabase = async () => {
        await logActivity({
            type: 'product',
            level: 'info',
            action: 'products_fetch_attempt',
            message: 'Attempting to fetch products from database',
            userId: user?.id || null,
            details: {
                categorySlug: slug,
                isLoggedIn: isLoggedIn,
                userRole: profile?.role
            }
        });

        const startTime = Date.now();

        try {
            setIsLoading(true);

            let productsData: Product[] = [];

            if (slug && slug !== "alldevices") {
                productsData = await fetchProductsBySlug(slug) as Product[];
            } else {
                let query = supabase
                    .from("products")
                    .select("*")
                    .order("date", { ascending: false });

                // Apply URL filters for alldevices
                searchParams.forEach((value, key) => {
                    // Skip non-filter parameters
                    if (key === 'q' || key === 'page' || key === '_') return;
                    
                    const dbColumn = URL_TO_DB_MAPPING[key];
                    if (dbColumn) {
                        const values = value.split(',').map(v => v.trim());
                        
                        if (values.length === 1) {
                            query = query.eq(dbColumn, values[0]);
                        } else if (values.length > 1) {
                            query = query.in(dbColumn, values);
                        }
                    }
                });

                const { data, error } = await query;

                if (error) {
                    await logActivity({
                        type: 'product',
                        level: 'error',
                        action: 'products_fetch_failed',
                        message: 'Failed to fetch all products from database',
                        userId: user?.id || null,
                        details: {
                            error: error,
                            executionTimeMs: Date.now() - startTime
                        },
                        status: 'failed'
                    });
                    productsData = [];
                } else if (data) {
                    productsData = data;

                    await logActivity({
                        type: 'product',
                        level: 'success',
                        action: 'products_fetch_success',
                        message: `Successfully fetched ${data.length} products from database`,
                        userId: user?.id || null,
                        details: {
                            totalProducts: data.length,
                            publishedProducts: data.filter(p => p.post_status === 'Publish').length,
                            outOfStockProducts: data.filter(p => p.stock_quantity === 0).length,
                            executionTimeMs: Date.now() - startTime
                        },
                        status: 'completed'
                    });
                }
            }

            setProducts(productsData);
            updateFilterOptions(productsData);

            // Initialize filters from URL for UI
            const urlFilters = getFiltersFromURL();
            if (Object.keys(urlFilters).length > 0) {
                setFilters(prev => ({
                    ...prev,
                    ...urlFilters
                }));
            }

            const allFilterKeys = [
                'formFactor',
                'processor',
                'memory',
                'storage',
                'screenSize',
                ...HARDCODED_FILTER_KEYS
            ];
            setOpenFilters(allFilterKeys);

        } catch (error) {
            await logActivity({
                type: 'product',
                level: 'error',
                action: 'products_fetch_error',
                message: 'Unexpected error while fetching products from database',
                userId: user?.id || null,
                details: {
                    error: error,
                    executionTimeMs: Date.now() - startTime
                },
                status: 'failed'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Toggle individual filter open/close state
    const toggleFilter = (filterType: string) => {
        setOpenFilters(prev =>
            prev.includes(filterType)
                ? prev.filter(f => f !== filterType)
                : [...prev, filterType]
        );
    };

    // Filter products based on selected filters (client-side)
    const filteredProducts = products.filter(product => {
        return Object.entries(filters).every(([key, values]) => {
            if (values.length === 0) return true;

            const keyMapping: Record<string, keyof Product> = {
                formFactor: "form_factor",
                fiveGEnabled: "five_g_Enabled",
                copilotPC: "copilot",
                processor: "processor",
                screenSize: "screen_size",
                memory: "memory",
                storage: "storage"
            };

            const productKey = keyMapping[key] || key as keyof Product;
            const productValue = product[productKey];

            if (productValue === undefined || productValue === null) {
                return false;
            }

            if (key === "copilotPC" || key === "fiveGEnabled") {
                return values.includes("Yes") ? productValue === true : true;
            }

            return values.includes(productValue.toString());
        });
    });

    // Sort the filtered products
    filteredProducts.sort((a, b) => {
        const aIsPublished = a.post_status === "Publish";
        const bIsPublished = b.post_status === "Publish";

        if (aIsPublished && !bIsPublished) return -1;
        if (!aIsPublished && bIsPublished) return 1;

        const aHasStock = a.stock_quantity > 0;
        const bHasStock = b.stock_quantity > 0;

        if (aHasStock && !bHasStock) return -1;
        if (!aHasStock && bHasStock) return 1;

        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;

        return dateB - dateA;
    });

    const handleFilterChange = (filterType: string, value: string) => {
        setFilters(prev => {
            const currentValues = Array.isArray(prev[filterType]) ? prev[filterType] : [];

            const newValues = currentValues.includes(value)
                ? currentValues.filter(v => v !== value)
                : [...currentValues, value];

            const updatedFilters = {
                ...prev,
                [filterType]: newValues
            };

            // Update URL when filters change
            updateURLWithFilters(updatedFilters);
            
            return updatedFilters;
        });
    };

    const clearFilters = () => {
        const clearedFilters = {
            formFactor: [],
            processor: [],
            screenSize: [],
            memory: [],
            storage: [],
            copilotPC: [],
            fiveGEnabled: [],
        };
        
        setFilters(clearedFilters);
        
        // Clear URL parameters
        const params = new URLSearchParams(searchParams.toString());
        Object.keys(URL_FILTER_MAPPING).forEach(key => {
            params.delete(key);
        });
        
        const queryString = params.toString();
        const newUrl = queryString 
            ? `${pathname}?${queryString}`
            : pathname;
        
        router.replace(newUrl, { scroll: false });
        
        // Refetch data without filters
        fetchDataFromDatabase();
    };

    const getActiveFilterCount = () => {
        return Object.values(filters).reduce((total, values) => total + values.length, 0);
    };

    // Helper component for database filter section
    const DatabaseFilterSection = ({ filterKey, title }: { filterKey: string, title: string }) => {
        const filterOptionsList = filterOptions[filterKey] || [];
        const currentFilterValues = filters[filterKey] || [];

        const handleCheckboxChange = (item: string) => {
            handleFilterChange(filterKey, item);
        };

        if (filterOptionsList.length === 0) return null;

        return (
            <div className="border-b pb-4">
                <button
                    onClick={() => toggleFilter(filterKey)}
                    className="flex items-center justify-between w-full text-left font-semibold text-gray-800 hover:text-[#3ba1da]"
                >
                    {title}
                    {openFilters.includes(filterKey) ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                </button>
                {openFilters.includes(filterKey) && (
                    <div className="mt-3 space-y-2">
                        {filterOptionsList.map(item => {
                            const checkboxId = `${filterKey}-${item}`;

                            return (
                                <div key={checkboxId} className="flex items-center space-x-3 py-1">
                                    <input
                                        type="checkbox"
                                        id={checkboxId}
                                        checked={currentFilterValues.includes(item)}
                                        onChange={() => handleCheckboxChange(item)}
                                        className="h-4 w-4 text-[#3ba1da] rounded border-gray-300 focus:ring-[#3ba1da]"
                                    />
                                    <label
                                        htmlFor={checkboxId}
                                        className="text-gray-700 text-sm cursor-pointer flex-1 select-none"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {item}
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // Helper component for hardcoded filter section
    const HardcodedFilterSection = ({ filterKey, title }: { filterKey: string, title: string }) => {
        const filterOptionsList = HARDCODED_FILTERS[filterKey as keyof typeof HARDCODED_FILTERS] || [];
        const currentFilterValues = filters[filterKey] || [];

        const handleCheckboxChange = (item: string) => {
            handleFilterChange(filterKey, item);
        };

        if (filterOptionsList.length === 0) return null;

        return (
            <div className="border-b pb-4">
                <button
                    onClick={() => toggleFilter(filterKey)}
                    className="flex items-center justify-between w-full text-left font-semibold text-gray-800 hover:text-[#3ba1da]"
                >
                    {title}
                    {openFilters.includes(filterKey) ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                </button>
                {openFilters.includes(filterKey) && (
                    <div className="mt-3 space-y-2">
                        {filterOptionsList.map(item => {
                            const checkboxId = `${filterKey}-hardcoded-${item}`;

                            return (
                                <div key={checkboxId} className="flex items-center space-x-3 py-1">
                                    <input
                                        type="checkbox"
                                        id={checkboxId}
                                        checked={currentFilterValues.includes(item)}
                                        onChange={() => handleCheckboxChange(item)}
                                        className="h-4 w-4 text-[#3ba1da] rounded border-gray-300 focus:ring-[#3ba1da]"
                                    />
                                    <label
                                        htmlFor={checkboxId}
                                        className="text-gray-700 text-sm cursor-pointer flex-1 select-none"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {item}
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    if (isLoggedIn === null) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3ba1da] mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="flex">
                {/* Fixed Filter Sidebar - Desktop */}
                <div className="hidden lg:block w-64 flex-shrink-0 h-full top-0 overflow-y-auto bg-white border-r border-gray-200">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            {getActiveFilterCount() > 0 && (
                                <button
                                    onClick={clearFilters}
                                    className="text-sm text-[#3ba1da] hover:text-[#41abd6]"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        {isLoading ? (
                            <FiltersSidebarSkeleton />
                        ) : (
                            <div className="space-y-4">
                                <DatabaseFilterSection filterKey="formFactor" title="Form Factor" />
                                <DatabaseFilterSection filterKey="processor" title="Processor" />
                                <DatabaseFilterSection filterKey="screenSize" title="Screen Size" />
                                <DatabaseFilterSection filterKey="memory" title="Memory" />
                                <DatabaseFilterSection filterKey="storage" title="Storage" />
                                <HardcodedFilterSection filterKey="copilotPC" title="Copilot + PC" />
                                <HardcodedFilterSection filterKey="fiveGEnabled" title="5G Enabled" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 min-h-screen sm:px-0 px-6">
                    {/* Mobile filter button */}
                    <div className="lg:hidden py-4 px-8 flex items-center justify-between gap-3">
                        <h1 className="text-4xl text-gray-900">
                            <span className="capitalize">{slug == "notebooks" ? "Laptops" : slug}</span>
                        </h1>
                        <button onClick={() => setShowFilters(true)} className="m-2">
                            <FaFilter size={15} />
                        </button>
                    </div>

                    {/* Products Section */}
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-2">
                        {!isLoading && getActiveFilterCount() > 0 && (
                            <div className="mb-8">
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {Object.entries(filters).map(([key, values]) =>
                                        values.map(value => (
                                            <span
                                                key={`${key}-${value}`}
                                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#3ba1da]/10 text-[#3ba1da] text-sm"
                                            >
                                                {value}
                                                <button
                                                    onClick={() => handleFilterChange(key, value)}
                                                    className="ml-1 hover:text-red-500"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </span>
                                        ))
                                    )}
                                    <button
                                        onClick={clearFilters}
                                        className="text-sm text-gray-600 hover:text-[#3ba1da]"
                                    >
                                        Clear all
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="w-full lg:max-w-7xl lg:mx-auto lg:px-6">
                            {isLoading ? (
                                <ProductsGridSkeleton />
                            ) : filteredProducts.length > 0 ? (
                                <>
                                    <div className="flex items-center justify-between sm:my-10 my-5">
                                        <div className="text-3xl font-semibold">
                                            <span className="capitalize">{slug == "notebooks" ? "Notebooks" : slug}</span> 
                                        </div>
                                        {(admin === profile?.role || shopManager === profile?.role) && (
                                            <div className="">
                                                <div className="flex justify-center md:justify-start">
                                                    <Link
                                                        href="/add-device"
                                                        className="inline-flex items-center justify-center rounded bg-[#35c8dc] px-5 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#33aaba] hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#3791b4]/50 sm:px-4 sm:py-2 sm:text-sm md:px-4 md:py-2 md:text-sm"
                                                    >
                                                        <FaPlus className="me-3" />
                                                        Add New Device
                                                    </Link>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-10">
                                        {filteredProducts.map(product => {
                                            if (product.post_status !== "Publish") {
                                                if (subscriber === profile?.role || superSubscriber === profile?.role) {
                                                    return null;
                                                }
                                            }
                                            const isProductInCart = checkIfInCart(product.id)
                                            return (
                                                <Link href={`/product/${product.slug}`} key={product.id}>
                                                    <div className="bg-white border border-gray-300 sm:py-5 p-3 overflow-hidden hover:shadow-md transition-shadow duration-300 group relative h-full flex flex-col">
                                                        {product.stock_quantity == 0 && (
                                                            <div className="absolute top-4 left-0 z-10 flex items-center gap-1 bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-br-full rounded-tr-full">
                                                                Out of stock
                                                            </div>
                                                        )}

                                                        {product.five_g_Enabled && (
                                                            <div className="absolute top-4 right-3 z-10">
                                                                <img
                                                                    src="/5g-logo.png"
                                                                    alt="5G Enabled"
                                                                    className="w-10 h-10 object-contain"
                                                                />
                                                            </div>
                                                        )}

                                                        {product.post_status !== "Publish" && (
                                                            <div className="absolute sm:top-45 sm:right-3 top-5 z-10 flex items-center gap-1 text-xs text-white font-semibold px-3 py-1 rounded-full rounded-tr-full bg-[#41abd6]">
                                                                Private
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-center transition-colors h-48 min-h-[12rem] sm:mt-0 -mt-12 relative">
                                                            {product.thumbnail ? (
                                                                <img
                                                                    src={product.thumbnail}
                                                                    alt={product.product_name}
                                                                    className="object-contain h-full w-full p-2"
                                                                />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full w-full text-gray-400">
                                                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col flex-grow space-y-2 text-center sm:mt-4 -mt-7">
                                                            <h3 className="text-gray-800 sm:text-md text-sm line-clamp-1 min-h-14 flex items-center justify-center">
                                                                {product.product_name}
                                                            </h3>

                                                            <div className="text-gray-500 text-xs sm:py-3 py-1 space-y-1">
                                                                <p><b>SKU:</b> {product.sku}</p>
                                                            </div>

                                                            <div className="flex-grow"></div>

                                                            <div className="sm:pt-4 sm:mb-2 mt-auto">
                                                                {product.stock_quantity != 0 && product.post_status === "Publish" ? (
                                                                    <>
                                                                        {isProductInCart ? (
                                                                            <div className="flex flex-col items-center space-y-2">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault()
                                                                                        e.stopPropagation()
                                                                                        handleRemoveFromCart(product.id)
                                                                                    }}
                                                                                    disabled={isUpdating}
                                                                                    className="sm:px-6 px-3 sm:py-2.5 py-1.5 text-sm text-red-600 hover:text-white border border-red-600 rounded-sm cursor-pointer hover:bg-red-500 hover:border-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                                                                >
                                                                                    Remove
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.preventDefault()
                                                                                    e.stopPropagation()
                                                                                    handleAddToCart(product.id)
                                                                                }}
                                                                                disabled={isUpdating && addingProductId === product.id}
                                                                                className="sm:px-6 px-3 sm:py-2.5 py-1.5 text-sm font-medium text-[#0a4647] border border-[#0a4647] rounded-sm cursor-pointer hover:bg-[#0a4647] hover:text-white transition-colors disabled:opacity-50"
                                                                            >
                                                                                {isUpdating && addingProductId === product.id ? 'Adding...' : 'Add to Cart'}
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <button
                                                                        className="sm:px-6 px-3 sm:py-2.5 py-1.5 text-sm font-medium text-[#4e5050] border border-[#484a4a] rounded-sm cursor-pointer hover:bg-[#eaebeb] transition-colors"
                                                                    >
                                                                        Read More
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-gray-600 text-lg">
                                        {products.length === 0 ? "No products found." : "No products found matching your filters."}
                                    </p>
                                    {products.length > 0 && (
                                        <button
                                            onClick={clearFilters}
                                            className="mt-4 text-[#3ba1da] hover:text-[#41abd6] font-medium"
                                        >
                                            Clear all filters
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile filters drawer */}
            <Drawer
                title={
                    <div className="flex items-center justify-between">
                        <span className="text-xl font-bold">Filters</span>
                        {getActiveFilterCount() > 0 && (
                            <button
                                onClick={clearFilters}
                                className="text-sm text-[#3ba1da] hover:text-[#41abd6]"
                            >
                                Clear all
                            </button>
                        )}
                    </div>
                }
                placement="right"
                onClose={() => setShowFilters(false)}
                open={showFilters}
                size={300}
                className="filter-drawer"
            >
                <div className="space-y-6">
                    <DatabaseFilterSection filterKey="formFactor" title="Form Factor" />
                    <DatabaseFilterSection filterKey="processor" title="Processor" />
                    <DatabaseFilterSection filterKey="screenSize" title="Screen Size" />
                    <DatabaseFilterSection filterKey="memory" title="Memory" />
                    <DatabaseFilterSection filterKey="storage" title="Storage" />
                    <HardcodedFilterSection filterKey="copilotPC" title="Copilot + PC" />
                    <HardcodedFilterSection filterKey="fiveGEnabled" title="5G Enabled" />
                </div>
            </Drawer>

            {/* Cart Drawer */}
            {isLoggedIn && (
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
                                    className="text-sm text-red-500 hover:text-red-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {cartUpdating ? 'Clearing...' : 'Clear All'}
                                </button>
                            )}
                        </div>
                    }
                    placement="right"
                    onClose={() => setShowCartDrawer(false)}
                    open={showCartDrawer}
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
                                className="px-6 py-2 bg-[#35c8dc] text-white rounded-md hover:bg-[#33aaba] transition-colors cursor-pointer"
                            >
                                Continue
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="flex-1 overflow-y-auto pr-2">
                                {cartItems.map((item) => {
                                    const productName = item.product?.product_name || 'Unknown Product';
                                    const sku = item.product?.sku || 'N/A';
                                    const thumbnail = item.product?.thumbnail;
                                    const price = item.product?.price || 0;
                                    const productSlug = item.product?.slug || '';

                                    return (
                                        <div key={item.id} className="border-b border-gray-200 py-4">
                                            <div className="flex items-start space-x-3">
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

                                                <div className="flex-1 min-w-0">
                                                    <h4
                                                        className="text-sm font-medium text-gray-900 truncate hover:text-[#35c8dc] cursor-pointer transition-colors"
                                                        onClick={() => productSlug && router.push(`/product/${productSlug}`)}
                                                    >
                                                        {productName}
                                                    </h4>
                                                    <p className="text-xs text-gray-500">SKU: {sku}</p>
                                                </div>

                                                <div className="flex flex-col items-end space-y-2">
                                                    <button
                                                        onClick={() => handleRemoveFromCart(item.product_id)}
                                                        disabled={cartUpdating}
                                                        className="text-gray-400 hover:text-red-500 p-1 transition-colors 
                                                      disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                                        </div>
                                    );
                                })}
                            </div>

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
            )}
        </div>
    );
}