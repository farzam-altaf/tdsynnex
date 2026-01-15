"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ShoppingCart,
    Heart,
    Share2,
    ChevronLeft,
    ChevronRight,
    Check,
    Truck,
    Shield,
    ArrowLeft,
    Clock,
    Delete
} from "lucide-react";
import { Carousel, Popconfirm, Skeleton } from "antd";
import { supabase } from "@/lib/supabase/client";
import { FaEdit } from "react-icons/fa";
import { FaDeleteLeft, FaMinus } from "react-icons/fa6";
import { MdDelete } from "react-icons/md";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import { useRef } from "react";
import type { CarouselRef } from "antd/es/carousel";
import { toast } from "sonner";
import { BiRadioCircle } from "react-icons/bi";
import { useCart } from "@/app/context/CartContext";

// Loading skeleton component
const ProductSkeleton = () => {
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
        <div className="min-h-screen">
            {/* Back Navigation Skeleton */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <Skeleton.Button active size="small" style={{ width: 100 }} />
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Main Product Section Skeleton */}
                <div className="bg-white rounded-xl overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 md:p-8">
                        {/* Left Column - Images Skeleton */}
                        <div>
                            <Skeleton.Image
                                active
                                style={{
                                    width: isMobile ? "340px" : "500px",
                                    height: isMobile ? "340px" : "500px",
                                    marginBottom: "16px",
                                }}
                            />
                            <div className="mt-4">
                                <Skeleton active paragraph={{ rows: 0 }} />
                            </div>
                        </div>

                        {/* Right Column - Info Skeleton */}
                        <div>
                            <Skeleton active paragraph={{ rows: 2 }} />
                            <div className="my-8">
                                <Skeleton active paragraph={{ rows: 1 }} />
                            </div>
                            <div className="mb-8">
                                <Skeleton active title={false} paragraph={{ rows: 6 }} />
                            </div>
                            <Skeleton.Button active size="large" style={{ width: '100%' }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
};

// Interface for product data
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
    isInStock: boolean;
    thumbnail: string;
    gallery: string[] | string; // Changed to accept both array and string
    user_id: string;
    created_at: string;
    formFactorTitle?: string;
    processorTitle?: string;
    memoryTitle?: string;
    storageTitle?: string;
    screenSizeTitle?: string;
}

// Related product interface
interface RelatedProduct {
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
    isInStock: boolean;
    thumbnail: string;
    gallery: string[] | string; // Changed to accept both array and string
    user_id: string;
    created_at: string;
    formFactorTitle?: string;
    processorTitle?: string;
    memoryTitle?: string;
    storageTitle?: string;
    screenSizeTitle?: string;
}

export default function Page() {
    const params = useParams();
    const router = useRouter();
    const { profile, isLoggedIn, loading, user } = useAuth();
    const slug = params.slug as string;
    const admin = process.env.NEXT_PUBLIC_ADMINISTRATOR;
    const shopManager = process.env.NEXT_PUBLIC_SHOPMANAGER;

    const [product, setProduct] = useState<Product | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
    const [isloading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [isWishlisted, setIsWishlisted] = useState(false);

    // Carousel ref for manual control
    const carouselRef = useRef<CarouselRef>(null);

    const {
        addToCart,
        removeFromCart,
        isUpdating,
        addingProductId,
        isInCart,
        cartItems
    } = useCart()

    // Carousel navigation functions
    const goToPreviousSlide = () => {
        if (carouselRef.current) {
            carouselRef.current.prev();
        }
    };

    const goToNextSlide = () => {
        if (carouselRef.current) {
            carouselRef.current.next();
        }
    };

    const [authChecked, setAuthChecked] = useState(false);
    const [authInitialized, setAuthInitialized] = useState(false);

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
            router.replace(`/login/?redirect_to=product/${slug}`);
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
    }, [authChecked, authInitialized]);

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

    const handleAddToCart = async (productId: string) => {
        try {
            await addToCart(productId, 1)
            toast.success('Product added to cart!', {
                style: { background: "black", color: "white" },
            })
        } catch (error: any) {
            let errorMessage = 'Failed to add product to cart. Please try again.'

            if (error?.code === '23505') {
                errorMessage = 'This product is already in your cart.'
            } else if (error?.code === '23503') {
                errorMessage = 'Product not found.'
                router.push(`/product/${slug}`)
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
            toast.success('Product removed from cart!', {
                style: { background: "black", color: "white" },
            })
        } catch (error: any) {
            console.error('Error removing from cart:', error)
            let errorMessage = 'Failed to remove product from cart. Please try again.'

            if (error?.message?.includes('not found')) {
                errorMessage = 'Product not found in cart.'
            }

            toast.error(errorMessage, {
                style: { background: "red", color: "white" },
            })
        }
    }

    // Check if product is in cart
    const checkIfInCart = (productId: string): boolean => {
        return isInCart(productId)
    }

    // Get cart item for specific product
    const getCartItemForProduct = (productId: string) => {
        return cartItems.find(item => item.product_id === productId)
    }

    // Main product action button with Read More for out of stock
    const renderMainActionButton = () => {
        if (!product) return null;

        if (product.stock_quantity === 0) {
            return (
                <div className="flex flex-col gap-2">
                    <button
                        className="flex items-center justify-center gap-2 px-5 py-2 border border-gray-400 text-gray-400 rounded-sm cursor-not-allowed transition-colors"
                        disabled
                    >
                        Out of Stock
                    </button>
                    <button
                        onClick={() => {
                            // Scroll to description section
                            const descriptionSection = document.getElementById('product-description');
                            if (descriptionSection) {
                                descriptionSection.scrollIntoView({ behavior: 'smooth' });
                            }
                        }}
                        className="flex items-center justify-center gap-2 px-5 py-2 border border-[#0a3637] text-[#0a3637] rounded-sm hover:bg-[#0a3637] hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Read More Details
                    </button>
                </div>
            );
        }

        if (product.post_status !== "Publish") {
            return (
                <div
                    className="flex w-56 items-center justify-center gap-2 px-5 py-2 border border-[#0a3637] text-[#0a3637] rounded-sm"
                >
                    Private
                </div>
            );
        }

        const isProductInCart = checkIfInCart(product.id);
        const cartItem = getCartItemForProduct(product.id);

        if (isProductInCart) {
            return (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleRemoveFromCart(product.id)}
                        disabled={isUpdating}
                        className="flex items-center justify-center gap-1 px-5 py-2 text-sm
               border border-red-600 bg-red-600 text-white rounded
               hover:bg-red-700 hover:border-red-700 font-medium
               disabled:opacity-50"
                    >
                        {isUpdating ? 'Removing...' : 'Remove from Cart'}
                    </button>
                </div>
            );
        } else {
            return (
                <button
                    onClick={() => handleAddToCart(product.id)}
                    disabled={isUpdating && addingProductId === product.id}
                    className="flex items-center justify-center gap-2 px-5 py-2 cursor-pointer border border-[#0a3637] text-[#0a3637] rounded-sm hover:bg-[#0a3637] hover:text-white transition-colors disabled:opacity-50"
                >
                    <ShoppingCart className="h-4 w-4" />
                    {isUpdating && addingProductId === product.id ? 'Adding...' : 'Add to Cart'}
                </button>
            );
        }
    };

    // Related product action button with Read More for out of stock
    const renderRelatedProductButton = (product: RelatedProduct) => {
        if (product.stock_quantity === 0) {
            return (
                <div className="flex flex-col gap-2">
                    <button
                        className="sm:px-6 px-3 sm:py-2.5 py-1.5 text-sm font-medium text-gray-400 border border-gray-400 rounded-sm cursor-not-allowed"
                        disabled
                    >
                        Out of Stock
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/product/${product.slug}`);
                        }}
                        className="sm:px-6 px-3 sm:py-2.5 py-1.5 text-sm font-medium text-[#0a4647] border border-[#0a4647] rounded-sm cursor-pointer hover:bg-[#0a4647] hover:text-white transition-colors"
                    >
                        Read More
                    </button>
                </div>
            );
        }
        if (product.post_status !== "Publish") {
            return (
                <div className="sm:pt-4 sm:mb-2 mt-auto">
                    <button
                        className="self-start sm:px-6 px-3 sm:py-2.5 py-1.5 text-sm font-medium
                                                                text-[#4e5050] border border-[#484a4a] rounded-sm
                                                                hover:bg-[#eaebeb] transition-colors"
                    >
                        Read More
                    </button>
                </div>
            );
        }

        const isProductInCart = checkIfInCart(product.id);
        const cartItem = getCartItemForProduct(product.id);

        if (isProductInCart) {
            return (
                <div className="space-y-2">
                    {/* Remove button */}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveFromCart(product.id);
                        }}
                        disabled={isUpdating}
                        className="sm:px-6 px-3 sm:py-2.5 py-1.5 text-sm font-medium text-red-500 border border-red-500 rounded-sm cursor-pointer hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                    >
                        Remove
                    </button>
                </div>
            );
        } else {
            return (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddToCart(product.id);
                    }}
                    disabled={isUpdating && addingProductId === product.id}
                    className="sm:px-6 px-3 sm:py-2.5 py-1.5 text-sm font-medium text-[#0a4647] border border-[#0a4647] rounded-sm cursor-pointer hover:bg-[#0a4647] hover:text-white transition-colors disabled:opacity-50"
                >
                    {isUpdating && addingProductId === product.id ? 'Adding...' : 'Add to Cart'}
                </button>
            );
        }
    };

    const parseGalleryImages = (galleryData: string | string[] | null): string[] => {
        if (!galleryData) return [];

        if (Array.isArray(galleryData)) {
            return galleryData;
        }

        try {
            // Try to parse as JSON if it's a string
            if (typeof galleryData === 'string') {
                // Check if it's already a JSON string array
                if (galleryData.startsWith('[') && galleryData.endsWith(']')) {
                    const parsed = JSON.parse(galleryData);
                    if (Array.isArray(parsed)) {
                        return parsed;
                    }
                }

                // Check if it's a comma-separated string
                if (galleryData.includes(',') && galleryData.includes('http')) {
                    // Remove brackets and quotes if present, then split
                    const cleaned = galleryData
                        .replace(/[\[\]"]/g, '')
                        .split(',')
                        .map(url => url.trim())
                        .filter(url => url.length > 0);
                    return cleaned;
                }

                // If it's a single URL string
                return [galleryData];
            }
        } catch (error) {
            console.error("Error parsing gallery images:", error);
        }

        return [];
    };

    // Prepare gallery images (thumbnail + gallery)
    const getGalleryImages = () => {
        if (!product) return [];

        const thumbnail = product.thumbnail || '';
        const galleryArray = parseGalleryImages(product.gallery);

        // Combine thumbnail with gallery, removing duplicates
        const allImages = [thumbnail, ...galleryArray].filter(Boolean);
        return [...new Set(allImages)]; // Remove duplicates
    };

    // Fetch product data
    useEffect(() => {
        const fetchProductData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch product by slug
                const { data: productData, error: productError } = await supabase
                    .from("products")
                    .select("*")
                    .eq("slug", slug)
                    .single();

                if (productError) {
                    router.push(`/product/${slug}`)
                    setError("Product not found");
                    return;
                }

                if (!productData) {
                    setError("Product not found");
                    return;
                }

                console.log("Product gallery data:", productData.gallery);
                console.log("Gallery type:", typeof productData.gallery);

                // Parse gallery images if needed
                const parsedGallery = parseGalleryImages(productData.gallery);
                const productWithParsedGallery = {
                    ...productData,
                    gallery: parsedGallery
                };

                setProduct(productWithParsedGallery);

                // Fetch filter titles for display
                const filterTypes = ["form_factor", "processor", "memory", "storage", "screen_size"];
                const filterPromises = filterTypes.map(async (type) => {
                    const { data } = await supabase
                        .from("filters")
                        .select("id, title")
                        .eq("type", type);

                    return { type, data: data || [] };
                });

                const filterResults = await Promise.all(filterPromises);

                // Create mapping object
                const filterMappings: Record<string, Record<string, string>> = {};
                filterResults.forEach(result => {
                    const key = result.type === "form_factor" ? "formFactor" :
                        result.type === "screen_size" ? "screenSize" : result.type;

                    const mapping: Record<string, string> = {};
                    result.data.forEach(item => {
                        mapping[item.id] = item.title;
                    });

                    filterMappings[key] = mapping;
                });

                // Map filter IDs to titles
                const productWithTitles = {
                    ...productWithParsedGallery,
                    formFactorTitle: filterMappings.formFactor?.[productData.form_factor] || productData.form_factor,
                    processorTitle: filterMappings.processor?.[productData.processor] || productData.processor,
                    memoryTitle: filterMappings.memory?.[productData.memory] || productData.memory,
                    storageTitle: filterMappings.storage?.[productData.storage] || productData.storage,
                    screenSizeTitle: filterMappings.screenSize?.[productData.screen_size] || productData.screen_size,
                };

                setProduct(productWithTitles);

                // Fetch related products based on filters
                const relatedConditions = [];

                if (productData.form_factor) {
                    relatedConditions.push(`form_factor.eq.${productData.form_factor}`);
                }

                if (productData.processor) {
                    relatedConditions.push(`processor.eq.${productData.processor}`);
                }

                const { data: relatedData, error: relatedError } = await supabase
                    .from("products")
                    .select("*")
                    .or(relatedConditions.join(','))
                    .neq("id", productData.id)
                    .limit(4);

                if (!relatedError && relatedData) {
                    setRelatedProducts(relatedData);
                }

            } catch (err) {
                console.error("Error:", err);
                setError("Failed to load product");
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            fetchProductData();
        }
    }, [slug]);

    // Handle quantity changes
    const increaseQuantity = () => setQuantity(prev => prev + 1);
    const decreaseQuantity = () => setQuantity(prev => prev > 1 ? prev - 1 : 1);

    const handleDeleteDevice = async () => {
        if (!product?.id) return;

        try {
            const { error } = await supabase
                .from("products")
                .delete()
                .eq("id", product.id)
                .eq("user_id", profile?.userId);

            if (error) {
                toast.error("Failed to delete product");
                return;
            }

            toast.success("Product deleted successfully");

            // ✅ Redirect after delete
            router.push("/product-category/alldevices");
        } catch (err) {
            console.error("Unexpected error:", err);
            toast.error("Something went wrong");
        }
    };


    // Split description into bullet points
    const descriptionPoints = product?.description
        ? product.description.split('\n').filter(point => point.trim())
        : [];

    // Calculate stock status
    const stockStatus = () => {
        if (!product) return { text: "", color: "", icon: null };

        if (!product.isInStock) {
            return {
                text: "Out of Stock",
                color: "bg-red-100 text-red-800",
                icon: null
            };
        }

        if (product.stock_quantity > 0 && product.stock_quantity <= 5) {
            return {
                text: `Only ${product.stock_quantity} Left`,
                color: "bg-yellow-100 text-yellow-800",
                icon: <Clock className="h-3 w-3 mr-1" />
            };
        }

        if (product.stock_quantity > 5) {
            return {
                text: `${product.stock_quantity} In Stock`,
                color: "bg-green-100 text-green-800",
                icon: <Check className="h-3 w-3 mr-1" />
            };
        }
    };

    const stockInfo = stockStatus();
    const galleryImages = getGalleryImages();

    // Loading state
    if (loading) {
        return <ProductSkeleton />;
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{error || "Product not found"}</h2>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-[#0e4647] text-white rounded-lg hover:bg-[#0a3637] transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Back Navigation */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <div className="mt-2 px-3">
                            <span className="text-xs">
                                <Link href={'/'} className="text-xs hover:text-red-700">
                                    Home
                                </Link>
                                {" / "}
                                <Link
                                    href={`/product-category/${product?.memoryTitle?.toLowerCase().replace(/\s+/g, '-')}/`}
                                    className="text-xs hover:text-red-700"
                                >
                                    {product?.memoryTitle}
                                </Link>
                                {" / "}
                                <span className="text-xs text-gray-600">{product?.product_name}</span>
                            </span>
                        </div>
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Product Main Section */}
                <div className="bg-white rounded-xl overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 md:p-8">
                        {/* Left Column - Product Images */}
                        <div>
                            {/* Main Image Carousel - Only show if there are images */}
                            {galleryImages.length > 0 ? (
                                <div className="relative rounded-lg overflow-hidden mb-4">
                                    {admin === profile?.role || shopManager === profile?.role && (
                                        <div className="absolute top-8 left-5 z-10">
                                            <div className="flex gap-2">
                                                <Link href={`/add-device?_=${product?.slug}`}>
                                                    <div className="cursor-pointer bg-white/90 text-[#41abd6] border border-[#41abd6] backdrop-blur-sm rounded-full p-2">
                                                        <FaEdit />
                                                    </div>
                                                </Link>
                                                <Popconfirm
                                                    title="Delete the device"
                                                    description="Are you sure to delete this device?"
                                                    okText="Yes"
                                                    cancelText="No"
                                                    onConfirm={handleDeleteDevice}
                                                    okButtonProps={{
                                                        danger: true,
                                                    }}
                                                >
                                                    <div className="cursor-pointer bg-white/90 text-red-500 border border-red-500 backdrop-blur-sm rounded-full p-2">
                                                        <MdDelete />
                                                    </div>
                                                </Popconfirm>
                                            </div>
                                        </div>
                                    )}

                                    {/* Carousel Container with Custom Navigation */}
                                    <div className="relative">
                                        <Carousel
                                            ref={carouselRef}
                                            dots={false}
                                            arrows={false} // Disable default arrows
                                            afterChange={(current) => setSelectedImage(current)}
                                        >
                                            {galleryImages.map((image, index) => (
                                                <div key={index} className="relative h-96 md:h-[500px]">
                                                    <img
                                                        src={image}
                                                        alt={`${product?.product_name} - Image ${index + 1}`}
                                                        className="object-contain w-full h-full p-4"
                                                        onError={(e) => {
                                                            e.currentTarget.src = '/placeholder-image.jpg';
                                                            e.currentTarget.alt = 'Image not available';
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </Carousel>

                                        {/* Custom Navigation Buttons - Only show if multiple images */}
                                        {galleryImages.length > 1 && (
                                            <>
                                                {/* Previous Button */}
                                                <button
                                                    onClick={goToPreviousSlide}
                                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-1 cursor-pointer z-10"
                                                    aria-label="Previous image"
                                                >
                                                    <ChevronLeft className="h-6 w-6" />
                                                </button>

                                                {/* Next Button */}
                                                <button
                                                    onClick={goToNextSlide}
                                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-1 cursor-pointer z-10"
                                                    aria-label="Next image"
                                                >
                                                    <ChevronRight className="h-6 w-6" />
                                                </button>

                                                {/* Image Counter */}
                                                <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full z-10">
                                                    {selectedImage + 1} / {galleryImages.length}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* 5G Badge if enabled */}
                                    {product?.five_g_Enabled && (
                                        <div className="absolute top-4 right-4 z-10">
                                            <div className="bg-white/90 backdrop-blur-sm rounded-full p-2">
                                                <img
                                                    src="/5g-logo.png"
                                                    alt="5G Enabled"
                                                    className="w-8 h-8 object-contain"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="relative rounded-lg overflow-hidden mb-4 h-96 md:h-[500px] bg-gray-100 flex items-center justify-center">
                                    <div className="text-gray-400">No images available</div>
                                </div>
                            )}

                            {/* Thumbnail Gallery - Only show if there are multiple images */}
                            {galleryImages.length > 1 && (
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                    {galleryImages.map((image, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                setSelectedImage(index);
                                                if (carouselRef.current) {
                                                    carouselRef.current.goTo(index);
                                                }
                                            }}
                                            className={`relative h-20 rounded-lg overflow-hidden border-2 ${selectedImage === index ? 'border-[#0e4647]' : 'border-transparent'}`}
                                        >
                                            <img
                                                src={image}
                                                alt={`Thumbnail ${index + 1}`}
                                                className="object-cover w-full h-full"
                                                onError={(e) => {
                                                    e.currentTarget.src = '/placeholder-thumbnail.jpg';
                                                    e.currentTarget.alt = 'Thumbnail not available';
                                                }}
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right Column - Product Info */}
                        <div>
                            {/* Product Header */}
                            <div className="mb-6 border-b pb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <h1 className="text-xl md:text-2xl sm:text-lg font-semibold text-gray-900">
                                        {product?.product_name}
                                    </h1>
                                </div>
                                <div className="text-gray-500 text-sm my-4">
                                    <b>SKU:</b> {product?.sku}
                                </div>
                            </div>

                            {/* Description Points with ID for Read More button */}
                            <div id="product-description">
                                {descriptionPoints.length > 0 && (
                                    <div className="mb-8">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Key Features</h3>
                                        <ul className="space-y-2">
                                            {descriptionPoints.map((point, index) => (
                                                <li key={index} className="flex items-start">
                                                    <BiRadioCircle className="h-5 w-5  mt-0.5 mr-1 flex-shrink-0" />
                                                    <span className="text-gray-700 text-sm">{point}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <h3 className="text-sm font-semibold text-[#a67e07] my-7">
                                            {product?.stock_quantity} / {product?.total_inventory} In Stock
                                        </h3>
                                    </div>
                                )}
                            </div>
                            {product?.stock_quantity != 0 ? (
                                <div className="space-y-4">
                                    {renderMainActionButton()}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <h1 className="text-red-500 font-bold text-lg">Out of stock</h1>
                                    <div className="border py-3 px-5">
                                        <h1 className="text-xl">Get an alert when the product is in stock</h1>
                                        <div className="border ps-2 py-2 my-4">
                                            {profile?.email}
                                        </div>
                                        <div className="">
                                            <button className="border rounded cursor-pointer text-base px-4 py-1.5 border-black mt-5">
                                                Add to Waitlist
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Related Products */}
                {relatedProducts.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 sm:mx-0 mx-4">Related Products</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6 gap-4 sm:mx-0 mx-4">
                            {relatedProducts.map(product => {
                                if (product.post_status !== "Publish") {
                                    return null;
                                }
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
                                                {product.stock_quantity != 0 ? (
                                                    <div className="sm:pt-4 sm:mb-2 mt-auto">
                                                        {renderRelatedProductButton(product)}
                                                    </div>
                                                ) : (
                                                    <div className="sm:pt-4 sm:mb-2 mt-auto">
                                                        <button
                                                            className="self-start sm:px-6 px-3 sm:py-2.5 py-1.5 text-sm font-medium
                                                                text-[#4e5050] border border-[#484a4a] rounded-sm
                                                                hover:bg-[#eaebeb] transition-colors"
                                                        >
                                                            Read More
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}