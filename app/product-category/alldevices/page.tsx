"use client";

import { useEffect, useState } from "react";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { Drawer, Skeleton } from "antd";
import { FaFilter } from "react-icons/fa";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { FaMinus, FaPlus } from "react-icons/fa6";
import { useCart } from "@/app/context/CartContext";
import { toast } from "sonner";

// Filter types to fetch from database
const FILTER_TYPES = ["form_factor", "processor", "screen_size", "memory", "storage"];

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
    form_factor: string; // This is the ID, not the title
    processor: string; // This is the ID, not the title
    memory: string; // This is the ID, not the title
    storage: string; // This is the ID, not the title
    screen_size: string; // This is the ID, not the title
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
    // We'll map these to titles from filters
    formFactorTitle?: string;
    processorTitle?: string;
    memoryTitle?: string;
    storageTitle?: string;
    screenSizeTitle?: string;
}

// Skeleton component for products grid
const ProductsGridSkeleton = () => {
    // Check for window only inside component
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Check on mount and on resize
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };

        // Initial check
        checkIfMobile();

        // Add event listener for resize
        window.addEventListener('resize', checkIfMobile);

        // Cleanup
        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    return (
        <div className="w-full lg:max-w-7xl lg:mx-auto lg:px-6">
            <div className="flex items-center justify-between sm:my-10 my-5">
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
    const {
        addToCart,
        removeFromCart,
        isUpdating,
        addingProductId,
        isInCart, // Add this
        cartItems
    } = useCart()

    // State for database filters
    const [databaseFilters, setDatabaseFilters] = useState<Record<string, string[]>>({});
    // State for filter mappings (ID to Title)
    const [filterMappings, setFilterMappings] = useState<Record<string, Record<string, string>>>({});
    // State for products
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [authInitialized, setAuthInitialized] = useState(false);
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

    const handleAddToCart = async (productId: string) => {
        try {
            await addToCart(productId, 1)
            toast.success('Product added to cart!', {
                style: { background: "black", color: "white" },
            })
        } catch (error: any) {
            console.error('Error adding to cart:', error)
            let errorMessage = 'Failed to add product to cart. Please try again.'

            if (error?.code === '23505') {
                errorMessage = 'This product is already in your cart.'
            } else if (error?.code === '23503') {
                errorMessage = 'Product not found.'
            } else if (error?.message?.includes('foreign key constraint')) {
                errorMessage = 'Invalid product. Please refresh the page and try again.'
            }

            toast.error(errorMessage, {
                style: { background: "red", color: "white" },
            })
        }
    }

    // Handle cart item removal
    const handleRemoveFromCart = async (productId: string) => {
        try {
            await removeFromCart(productId)
        } catch (error) {
            console.error('Error removing from cart:', error)
        }
    }

    const checkIfInCart = (productId: string): boolean => {
        return isInCart(productId)
    }


    const [showFilters, setShowFilters] = useState(false);
    // Set all filters to be open by default
    const [openFilters, setOpenFilters] = useState<string[]>([]);
    console.log("profile", profile, loading, isLoggedIn)

    // Handle auth check - IMPROVED VERSION
    useEffect(() => {
        // Only run auth check after auth is fully initialized
        if (loading) {
            // Still loading auth state
            console.log("AuthContext is still loading...");
            return;
        }

        // AuthContext loading is done, mark as initialized
        console.log("AuthContext loaded - User:", user, "Profile:", profile, "isLoggedIn:", isLoggedIn);
        setAuthInitialized(true);

        // Now check authentication status
        if (!isLoggedIn || profile?.isVerified === false && !profile) {
            console.log("User not authenticated, redirecting to login");
            router.replace('/login/?redirect_to=product-category/alldevices');
        } else {
            console.log("User authenticated, setting authChecked to true");
            setAuthChecked(true);
        }
    }, [loading, isLoggedIn, profile, user, router]);

    // Fetch data only after auth is confirmed AND initialized
    useEffect(() => {
        if (!authChecked || !authInitialized) {
            return; // Don't fetch data until auth is fully checked AND initialized
        }

        console.log("Auth confirmed and initialized, fetching data...");
        fetchDataFromDatabase();
    }, [authChecked, authInitialized]);

    // Fetch all data from database
    const fetchDataFromDatabase = async () => {
        if (!authChecked) return;
        try {
            setIsLoading(true);

            // 1. Fetch filters from database
            const allFilters: Record<string, string[]> = {};
            const mappings: Record<string, Record<string, string>> = {};
            if (isLoggedIn) {
                // Fetch each filter type
                for (const type of FILTER_TYPES) {
                    const { data, error } = await supabase
                        .from("filters")
                        .select("id, title")
                        .eq("type", type)
                        .order("title");

                    if (error) {
                        console.error(`Error fetching ${type} filters:`, error);
                        allFilters[type] = [];
                        mappings[type] = {};
                    } else {
                        // Map database type names to frontend names
                        const frontendKey = type === "form_factor" ? "formFactor" :
                            type === "screen_size" ? "screenSize" : type;

                        // Store titles for display
                        allFilters[frontendKey] = data?.map(item => item.title) || [];

                        // Create ID to title mapping for this filter type
                        const idToTitle: Record<string, string> = {};
                        data?.forEach(item => {
                            idToTitle[item.id] = item.title;
                        });

                        mappings[frontendKey] = idToTitle;
                    }
                }

                setDatabaseFilters(allFilters);
                setFilterMappings(mappings);

                // 2. Fetch products from database
                const { data: productsData, error: productsError } = await supabase
                    .from("products")
                    .select("*")
                    .order("date", { ascending: false });

                if (productsError) {
                    console.error("Error fetching products:", productsError);
                    setProducts([]);
                } else if (productsData) {
                    // Now that mappings are set, we need to map products with the correct mappings
                    // Since state updates are async, we need to use the local mappings variable
                    const productsWithTitles = productsData.map(product => ({
                        ...product,
                        // Map filter IDs to titles using the local mappings variable
                        formFactorTitle: mappings.formFactor?.[product.form_factor] || product.form_factor,
                        processorTitle: mappings.processor?.[product.processor] || product.processor,
                        memoryTitle: mappings.memory?.[product.memory] || product.memory,
                        storageTitle: mappings.storage?.[product.storage] || product.storage,
                        screenSizeTitle: mappings.screenSize?.[product.screen_size] || product.screen_size,
                    }));

                    setProducts(productsWithTitles);
                }

                // Initialize open filters with all available keys
                const allFilterKeys = [...Object.keys(allFilters), ...HARDCODED_FILTER_KEYS];
                setOpenFilters(allFilterKeys);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
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

    // Filter products based on selected filters
    const filteredProducts = products.filter(product => {
        return Object.entries(filters).every(([key, values]) => {
            if (values.length === 0) return true;

            // Map filter keys to product property names
            const keyMapping: Record<string, keyof Product> = {
                formFactor: "formFactorTitle",
                fiveGEnabled: "five_g_Enabled",
                copilotPC: "copilot",
                processor: "processorTitle",
                screenSize: "screenSizeTitle",
                memory: "memoryTitle",
                storage: "storageTitle"
            };

            const productKey = keyMapping[key] || key as keyof Product;
            const productValue = product[productKey];

            // Handle undefined/null values
            if (productValue === undefined || productValue === null) {
                return false;
            }

            // Handle boolean filters
            if (key === "copilotPC" || key === "fiveGEnabled") {
                return values.includes("Yes") ? productValue === true : true;
            }

            // Handle string values (for filter titles)
            return values.includes(productValue.toString());
        });
    });

    // Sort the filtered products
    filteredProducts.sort((a, b) => {
        // Priority 1: Post Status (Publish first, then others)
        const aIsPublished = a.post_status === "Publish";
        const bIsPublished = b.post_status === "Publish";

        if (aIsPublished && !bIsPublished) return -1;
        if (!aIsPublished && bIsPublished) return 1;

        // Priority 2: Stock Quantity (non-zero first, zero last)
        const aHasStock = a.stock_quantity > 0;
        const bHasStock = b.stock_quantity > 0;

        if (aHasStock && !bHasStock) return -1;
        if (!aHasStock && bHasStock) return 1;

        // Priority 3: Date (latest first)
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;

        return dateB - dateA; // Descending order (latest first)
    });

    // Alternative: More explicit sorting with numeric priorities
    // filteredProducts.sort((a, b) => {
    //     // Create priority score for each product
    //     const getPriority = (product) => {
    //         let priority = 0;

    //         // Post Status: Publish = 2, others = 1
    //         priority += product.post_status === "Publish" ? 2 : 1;

    //         // Stock Quantity: Has stock = 2, no stock = 1
    //         priority += product.stock_quantity > 0 ? 2 : 1;

    //         // Date: Convert to timestamp (milliseconds)
    //         const dateScore = product.date ? new Date(product.date).getTime() : 0;

    //         return { priority, dateScore };
    //     };

    //     const priorityA = getPriority(a);
    //     const priorityB = getPriority(b);

    //     // Compare priority scores first
    //     if (priorityA.priority !== priorityB.priority) {
    //         return priorityB.priority - priorityA.priority; // Higher priority first
    //     }

    //     // If same priority, compare dates
    //     return priorityB.dateScore - priorityA.dateScore; // Latest date first
    // });


    const handleFilterChange = (filterType: string, value: string) => {
        setFilters(prev => {
            const currentValues = prev[filterType] || [];
            const newValues = currentValues.includes(value)
                ? currentValues.filter(v => v !== value)
                : [...currentValues, value];

            return { ...prev, [filterType]: newValues };
        });
    };

    const clearFilters = () => {
        setFilters({
            formFactor: [],
            processor: [],
            screenSize: [],
            memory: [],
            storage: [],
            copilotPC: [],
            fiveGEnabled: [],
        });
    };

    const getActiveFilterCount = () => {
        return Object.values(filters).reduce((total, values) => total + values.length, 0);
    };

    // Helper component for database filter section
    const DatabaseFilterSection = ({ filterKey, title }: { filterKey: string, title: string }) => {
        const filterOptions = databaseFilters[filterKey] || [];

        if (filterOptions.length === 0) return null;

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
                    <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                        {filterOptions.map(item => (
                            <label key={item} className="flex items-center space-x-3 cursor-pointer py-1">
                                <input
                                    type="checkbox"
                                    checked={filters[filterKey]?.includes(item) || false}
                                    onChange={() => handleFilterChange(filterKey, item)}
                                    className="h-4 w-4 text-[#3ba1da] rounded border-gray-300 focus:ring-[#3ba1da]"
                                />
                                <span className="text-gray-700 text-sm">{item}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Helper component for hardcoded filter section
    const HardcodedFilterSection = ({ filterKey, title }: { filterKey: string, title: string }) => {
        const filterOptions = HARDCODED_FILTERS[filterKey as keyof typeof HARDCODED_FILTERS] || [];

        if (filterOptions.length === 0) return null;

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
                        {filterOptions.map(item => (
                            <label key={item} className="flex items-center space-x-3 cursor-pointer py-1">
                                <input
                                    type="checkbox"
                                    checked={filters[filterKey]?.includes(item) || false}
                                    onChange={() => handleFilterChange(filterKey, item)}
                                    className="h-4 w-4 text-[#3ba1da] rounded border-gray-300 focus:ring-[#3ba1da]"
                                />
                                <span className="text-gray-700 text-sm">{item}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Get all filter keys for rendering
    const allFilterKeys = [...Object.keys(databaseFilters), ...HARDCODED_FILTER_KEYS];

    // Optional: prevent UI flicker - MUST BE AFTER ALL HOOKS
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

                        {/* Show skeleton only for filter options when loading */}
                        {isLoading ? (
                            <FiltersSidebarSkeleton />
                        ) : (
                            <div className="space-y-4">
                                {/* Database Filters */}
                                {Object.keys(databaseFilters).map(key => {
                                    const titleMap: Record<string, string> = {
                                        formFactor: "Form Factor",
                                        processor: "Processor",
                                        screenSize: "Screen Size",
                                        memory: "Memory",
                                        storage: "Storage"
                                    };

                                    return (
                                        <DatabaseFilterSection
                                            key={key}
                                            filterKey={key}
                                            title={titleMap[key] || key}
                                        />
                                    );
                                })}

                                {/* Hardcoded Filters */}
                                <HardcodedFilterSection filterKey="copilotPC" title="Copilot + PC" />
                                <HardcodedFilterSection filterKey="fiveGEnabled" title="5G Enabled" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Area (right side of sidebar) */}
                <div className="flex-1 min-h-screen sm:px-0 px-6">
                    {/* Mobile filter button */}
                    <div className="lg:hidden p-4 flex items-center justify-between gap-3 px-7">
                        {/* Mobile Heading */}
                        <div className="w-6 h-6">
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            All Devices
                        </h1>

                        {/* Filter Button */}
                        <button
                            onClick={() => setShowFilters(true)}
                            className="m-2"
                        >
                            <FaFilter size={15} />
                        </button>
                    </div>


                    {/* Full Width Banner - Only on Large Screens */}
                    <div className="relative h-[60vh] w-full overflow-hidden hidden lg:block">
                        <div
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{
                                backgroundImage: "url('/products-panel.png')",
                            }}
                        />
                    </div>


                    {/* Products Section */}
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-14">
                        {/* Results header - Only show when not loading */}
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

                        {/* Products grid - Show skeleton when loading */}
                        <div className="w-full lg:max-w-7xl lg:mx-auto lg:px-6">
                            {isLoading || !authChecked ? (
                                <ProductsGridSkeleton />
                            ) : filteredProducts.length > 0 ? (
                                <>
                                    {admin === profile?.role || shopManager === profile?.role && (
                                        <div className="flex items-center justify-between sm:my-10 my-5">
                                            <div className="text-3xl font-semibold">Devices</div>
                                            <div className="">
                                                <div className="flex justify-center md:justify-start">
                                                    <Link
                                                        href="/add-device"
                                                        className="inline-flex items-center justify-center rounded bg-[#41abd6] px-5 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#3791b4] hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#3791b4]/50 sm:px-4 sm:py-2 sm:text-sm md:px-4 md:py-2 md:text-sm"
                                                    >
                                                        <FaPlus className="me-3" />
                                                        Add New Device
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-10">
                                        {filteredProducts.map(product => {
                                            // If product is not published, only show to admin/shop_manager
                                            if (product.post_status !== "Publish") {
                                                if (subscriber === profile?.role || superSubscriber === profile?.role) {
                                                    return null; // Don't render this product for non-admin users
                                                }
                                            }

                                            const isProductInCart = checkIfInCart(product.id)

                                            return (
                                                <Link href={`/product/${product.slug}`} key={product.id}>
                                                    <div className="bg-white border border-gray-300 sm:py-5 p-3 overflow-hidden hover:shadow-md transition-shadow duration-300 group relative h-full flex flex-col"
                                                    >
                                                        {product.stock_quantity == 0 && (
                                                            <div className="absolute top-4 left-0 z-10 flex items-center gap-1 bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-br-full rounded-tr-full">
                                                                Out of stock
                                                            </div>
                                                        )}

                                                        {/* 5G Logo - Top Right Corner */}
                                                        {product.five_g_Enabled && (
                                                            <div className="absolute top-4 right-3 z-10">
                                                                <img
                                                                    src="/5g-logo.png"
                                                                    alt="5G Enabled"
                                                                    className="w-10 h-10 object-contain"
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Show Private badge only for admin/shop manager users when product is not published */}
                                                        {product.post_status !== "Publish" && (
                                                            <div className="absolute sm:top-45 sm:right-3 top-5 z-10 flex items-center gap-1 text-xs text-white font-semibold px-3 py-1 rounded-full rounded-tr-full bg-[#41abd6]">
                                                                Private
                                                            </div>
                                                        )}

                                                        {/* Image Container - Fixed Height */}
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

                                                        {/* Product Info Container - Flexible but with constraints */}
                                                        <div className="flex flex-col flex-grow space-y-2 text-center sm:mt-4 -mt-7">
                                                            {/* Title with fixed lines */}
                                                            <h3 className="text-gray-800 sm:text-md text-sm line-clamp-1 min-h-14 flex items-center justify-center">
                                                                {product.product_name}
                                                            </h3>

                                                            {/* SKU Info - Fixed height */}
                                                            <div className="text-gray-500 text-xs sm:py-3 py-1 space-y-1">
                                                                <p><b>SKU:</b> {product.sku}</p>
                                                            </div>

                                                            {/* Spacer to push button to bottom */}
                                                            <div className="flex-grow"></div>

                                                            {/* Button Container - Fixed at bottom */}
                                                            <div className="sm:pt-4 sm:mb-2 mt-auto">
                                                                {product.stock_quantity != 0 && product.post_status === "Publish" ? (
                                                                    <>
                                                                        {isProductInCart ? (
                                                                            // Remove from cart button
                                                                            <div className="flex flex-col items-center space-y-2">

                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault() // Prevent Link navigation
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
                                                                            // Add to cart button
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.preventDefault() // Prevent Link navigation
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
                    {/* Database Filters */}
                    {Object.keys(databaseFilters).map(key => {
                        const titleMap: Record<string, string> = {
                            formFactor: "Form Factor",
                            processor: "Processor",
                            screenSize: "Screen Size",
                            memory: "Memory",
                            storage: "Storage"
                        };

                        return (
                            <DatabaseFilterSection
                                key={key}
                                filterKey={key}
                                title={titleMap[key] || key}
                            />
                        );
                    })}

                    {/* Hardcoded Filters */}
                    <HardcodedFilterSection filterKey="copilotPC" title="Copilot + PC" />
                    <HardcodedFilterSection filterKey="fiveGEnabled" title="5G Enabled" />
                </div>
            </Drawer>
        </div>
    );
}