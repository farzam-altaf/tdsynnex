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
    Clock
} from "lucide-react";
import { Carousel, Skeleton } from "antd";
import { supabase } from "@/lib/supabase/client";

// Loading skeleton component
const ProductSkeleton = () => (
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
                                width: '100%',
                                height: '500px',
                                borderRadius: '8px'
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
);

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
    thumbnail: string;
    price?: number;
}

export default function ProductPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [product, setProduct] = useState<Product | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [isWishlisted, setIsWishlisted] = useState(false);

    // Function to parse gallery images from text/string to array
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
                    console.error("Error fetching product:", productError);
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
                    .select("id, product_name, thumbnail, sku")
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
    if (error || !product) {
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
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        <span className="text-sm">Back to Products</span>
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
                                    <Carousel
                                        dots={false}
                                        arrows={true}
                                        afterChange={(current) => setSelectedImage(current)}
                                    >
                                        {galleryImages.map((image, index) => (
                                            <div key={index} className="relative h-96 md:h-[500px]">
                                                <img
                                                    src={image}
                                                    alt={`${product.product_name} - Image ${index + 1}`}
                                                    className="object-contain w-full h-full p-4"
                                                    onError={(e) => {
                                                        e.currentTarget.src = '/placeholder-image.jpg';
                                                        e.currentTarget.alt = 'Image not available';
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </Carousel>

                                    {/* 5G Badge if enabled */}
                                    {product.five_g_Enabled && (
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
                                            onClick={() => setSelectedImage(index)}
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
                            <div className="mb-6 border-b pb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h1 className="text-3xl md:text-2xl font-bold text-gray-900">
                                        {product.product_name}
                                    </h1>
                                </div>
                                <div className="text-gray-500 text-sm my-4">
                                    SKU: {product.sku}
                                </div>
                            </div>

                            {/* Description Points */}
                            {descriptionPoints.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Features</h3>
                                    <ul className="space-y-2">
                                        {descriptionPoints.map((point, index) => (
                                            <li key={index} className="flex items-start">
                                                <Check className="h-5 w-5  mt-0.5 mr-3 flex-shrink-0" />
                                                <span className="text-gray-700">{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <h3 className="text-lg font-semibold text-lime-600 my-7">{product.stock_quantity} / {product.total_inventory} In Stock</h3>
                                </div>
                            )}

                            {/* Quantity Selector and Action Buttons */}
                            <div className="space-y-4">
                                {/* Action Buttons */}
                                <button
                                    className="flex items-center justify-center gap-2 px-6 py-3 border border-[#0a3637] text-[#0a3637] hover:text-white rounded-sm hover:bg-[#0a3637] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!product.isInStock}
                                >
                                    {product.isInStock ? 'Add to Cart' : 'Out of Stock'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Related Products */}
                {relatedProducts.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">You Might Also Like</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {relatedProducts.map((relatedProduct) => (
                                <div
                                    key={relatedProduct.id}
                                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                                    onClick={() => router.push(`/product/${relatedProduct.id}`)}
                                >
                                    <div className="p-4">
                                        <div className="h-40 bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                                            {relatedProduct.thumbnail ? (
                                                <img
                                                    src={relatedProduct.thumbnail}
                                                    alt={relatedProduct.product_name}
                                                    className="object-contain w-full h-full p-2"
                                                    onError={(e) => {
                                                        e.currentTarget.src = '/placeholder-image.jpg';
                                                        e.currentTarget.alt = 'Image not available';
                                                    }}
                                                />
                                            ) : (
                                                <div className="text-gray-400">No Image</div>
                                            )}
                                        </div>
                                        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                                            {relatedProduct.product_name}
                                        </h3>
                                        <button className="w-full py-2 text-sm font-medium text-[#0e4647] border border-[#0e4647] rounded hover:bg-[#0e4647] hover:text-white transition-colors">
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}