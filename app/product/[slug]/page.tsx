"use client";

import { useState } from "react";
import Image from "next/image";
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
    Star,
    Clock
} from "lucide-react";

export default function ProductPage() {
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [isWishlisted, setIsWishlisted] = useState(false);

    // Product images gallery
    const productImages = [
        "/pro-laptop-1.png",
        "/pro-laptop-1.png",
        "/pro-laptop-1.png",
        "/pro-laptop-1.png",
    ];

    // Product specifications
    const specifications = [
        { label: "Processor", value: "Snapdragon X Plus 10-Core Processor" },
        { label: "Memory", value: "16GB LPDDR5x" },
        { label: "Storage", value: "512GB SSD" },
        { label: "Display", value: '12″ LCD Pixelsense Flow Touchscreen' },
        { label: "Resolution", value: "2880 x 1920 Screen Resolution (267 ppi)" },
        { label: "GPU", value: "Qualcomm Adreno GPU | Hexagon NPU" },
        { label: "Connectivity", value: "Wi-Fi 7 | 5G Mobile Broadband | BT 5.4" },
        { label: "Front Camera", value: "Front Camera with Windows Studio Effects" },
        { label: "Rear Camera", value: "10.5MP Ultra HD Rear Camera" },
        { label: "Optimized For", value: "Microsoft Copilot" },
        { label: "Operating System", value: "Windows 11 Pro" },
    ];

    // Product features
    const features = [
        "Snapdragon X Plus processor for enhanced performance",
        "16GB LPDDR5x memory for seamless multitasking",
        "512GB SSD for lightning-fast storage",
        "12″ Pixelsense Flow Touchscreen with high resolution",
        "5G mobile broadband for ultra-fast connectivity",
        "Windows Studio Effects for professional video calls",
        "Optimized for Microsoft Copilot AI assistance",
        "Premium build quality with Surface signature design",
    ];

    // Reviews data
    const reviews = [
        {
            id: 1,
            name: "Alex Johnson",
            rating: 5,
            date: "2024-01-15",
            comment: "Absolutely love this Surface Pro! The performance is incredible and battery life lasts all day.",
            verified: true,
        },
        {
            id: 2,
            name: "Sarah Williams",
            rating: 4,
            date: "2024-01-12",
            comment: "Great device for productivity. The screen is amazing and the Copilot features are very helpful.",
            verified: true,
        },
        {
            id: 3,
            name: "Michael Chen",
            rating: 5,
            date: "2024-01-10",
            comment: "Perfect for both work and entertainment. The 5G connectivity is super fast.",
            verified: false,
        },
    ];

    // Handle quantity changes
    const increaseQuantity = () => setQuantity(prev => prev + 1);
    const decreaseQuantity = () => setQuantity(prev => prev > 1 ? prev - 1 : 1);

    // Calculate price (example)
    const price = 1299.99;
    const totalPrice = price * quantity;

    return (
        <div className="min-h-screen">
            {/* Back Navigation */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <button className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
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
                            {/* Main Image */}
                            <div className="relative h-96 md:h-[500px] rounded-lg overflow-hidden mb-4">
                                <Image
                                    src={productImages[selectedImage]}
                                    alt="Surface Pro 11"
                                    fill
                                    className="object-contain p-4"
                                    priority
                                />

                                {/* Stock Badge */}
                                <div className="absolute top-4 left-4">
                                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full flex items-center">
                                        <Check className="h-3 w-3 mr-1" />
                                        2 In Stock
                                    </span>
                                </div>
                            </div>

                        
                        </div>

                        {/* Right Column - Product Info */}
                        <div>
                            {/* Product Header */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h1 className="text-3xl md:text-2xl font-bold text-gray-900">
                                        Surface Pro 11 – Snapdragon X Plus – 16GB – 512GB SSD – 12″ w/Type Cover
                                    </h1>
                                </div>
                            </div>


                            

                            {/* Features Highlights */}
                            <div className="mb-8">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Features</h3>
                                <ul className="space-y-2">
                                    {features.map((feature, index) => (
                                        <li key={index} className="flex items-start">
                                            <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                                            <span className="text-gray-700">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
{/* Action Buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                                <button className="flex items-center justify-center gap-2 px-6 py-3 bg-[#0e4647] text-white rounded-lg hover:bg-[#0a3637] transition-colors font-medium">
                                    <ShoppingCart className="h-5 w-5" />
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Related Products */}
                <div className="mt-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">You Might Also Like</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((item) => (
                            <div key={item} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                                <div className="p-4">
                                    <div className="h-40 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                                        <div className="text-gray-400">Product Image</div>
                                    </div>
                                    <h3 className="font-medium text-gray-900 mb-2">Surface Laptop {item}</h3>
                                    <div className="text-[#0e4647] font-semibold mb-3">$1,199.99</div>
                                    <button className="w-full py-2 text-sm font-medium text-[#0e4647] border border-[#0e4647] rounded hover:bg-[#0e4647] hover:text-white transition-colors">
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}