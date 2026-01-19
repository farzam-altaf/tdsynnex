"use client";
// Adjust the import path as needed
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { useRouter } from 'next/navigation';
import { FaRemoveFormat } from 'react-icons/fa';
import { MdDeleteSweep, MdOutlineDeleteOutline } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircleIcon, Trash } from 'lucide-react';
import { AiOutlineShoppingCart } from 'react-icons/ai';

// Cart summary data (you might want to fetch this from your API too)
const cartSummary = {
    shipsWithin: "48 hours of Approval",
    shipmentType: "Overnight",
    demoPeriod: "Up to 30 Days",
};

export default function Page() {
    const {
        cartItems,
        isLoading,
        isUpdating,
        updateQuantity,
        removeFromCart,
        clearCart,
        getCartTotal,
        getCartTotalItems,
        refreshCart,
        cartCount
    } = useCart();

    const [shippingCost, setShippingCost] = useState(19.99);
    const [taxRate] = useState(0.08); // 8% tax
    const [removingItemId, setRemovingItemId] = useState<string | null>(null); // Track which item is being removed

    // Calculate totals
    const subtotal = getCartTotal();
    const tax = subtotal * taxRate;
    const total = subtotal + shippingCost + tax;

    const router = useRouter();
    const { profile, isLoggedIn, loading, user } = useAuth();
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
            router.replace('/login/?redirect_to=cart');
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

    // Handle item removal
    const handleRemoveItem = async (productId: string) => {
        setRemovingItemId(productId); // Set the specific item being removed
        try {
            await removeFromCart(productId);
        } catch (error) {
            console.error('Error removing item:', error);
        } finally {
            setRemovingItemId(null); // Clear the removing state
        }
    };

    // Handle clear cart
    const handleClearCart = async () => {
        if (confirm('Are you sure you want to clear your entire cart?')) {
            try {
                await clearCart();
            } catch (error) {
                console.error('Error clearing cart:', error);
            }
        }
    };

    // Handle checkout
    const handleCheckout = () => {
        router.replace('/checkout')
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <div className="animate-pulse">
                            <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Empty cart state
    if (cartItems.length === 0) {
        return (
            <div className="h-[83vh] px-4 flex items-center justify-center">
                <div className="max-w-6xl w-full">
                    <div className="bg-white rounded-lg p-12 text-center">
                        <div className="text-6xl mb-6 flex justify-center">
                            <AiOutlineShoppingCart />
                        </div>

                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                            Your cart is empty
                        </h2>

                        <p className="text-gray-600 mb-8">
                            Add items to your cart to get started
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {cartCount > 1 ? (
                    <div className='my-4 border border-red-500 rounded-lg'>
                        <Alert variant="destructive">
                            <AlertCircleIcon />
                            <AlertTitle>Your checkout could not be processed.</AlertTitle>
                            <AlertDescription>
                                <p>A maximum of one product is allowed per order.</p>
                                <ul className="list-inside list-disc text-sm">
                                    <li>Only one unit can be purchased per order.</li>
                                </ul>
                            </AlertDescription>
                        </Alert>
                    </div>
                ) : (
                    <>
                        <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Cart</h1>
                    </>
                )}

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Cart Items Section */}
                    <div className="lg:w-2/3">
                        <div className="border px-3 mb-6">
                            {cartItems.map((item) => {
                                const isRemovingThisItem = removingItemId === item.product_id;
                                return (
                                    <div
                                        key={item.product_id}
                                        className="flex flex-col sm:flex-row gap-6 py-2 border-b border-gray-200 last:border-0"
                                    >
                                        {/* Product Image */}
                                        <div className="sm:w-1/4 flex justify-center">
                                            <div className="w-38 h-38 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                                {item.product?.thumbnail ? (
                                                    <Image
                                                        src={item.product.thumbnail}
                                                        alt={item.product.product_name || 'Product image'}
                                                        width={70}
                                                        height={70}
                                                        className="object-cover w-full h-full"
                                                    />
                                                ) : (
                                                    <span className="text-gray-400">No Image</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Product Details */}
                                        <div className="sm:w-3/4">
                                            <Link href={`/product/${item.product?.slug}`}>
                                                <h3 className="text-md font-semibold text-cyan-800 mb-2">
                                                    {item.product?.product_name || 'Product Name Not Available'}
                                                </h3>
                                            </Link>

                                            {item.product?.sku && (
                                                <Link href={`/product/${item.product?.slug}`}>
                                                    <p className="text-sm text-gray-500 mb-2">SKU: <b className='text-cyan-800'>{item.product.sku}</b></p>
                                                </Link>
                                            )}

                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4">
                                                <div className="flex items-center space-x-4">
                                                    <button
                                                        onClick={() => handleRemoveItem(item.product_id)}
                                                        className="text-red-600 hover:text-red-800 font-medium"
                                                        disabled={isRemovingThisItem || isUpdating}
                                                    >
                                                        {isRemovingThisItem ? (
                                                            <div className='flex items-center gap-2 border py-1 px-4 rounded-sm border-red-500 cursor-pointer opacity-70'>
                                                                <MdDeleteSweep />
                                                                <span className='text-sm font-medium'>Removing...</span>
                                                            </div>
                                                        ) : (
                                                            <div className='flex items-center gap-2 border py-1 px-4 rounded-sm border-red-500 cursor-pointer hover:bg-red-50'>
                                                                <Trash size={12} />
                                                                <span className='text-sm font-medium'>Remove</span>
                                                            </div>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Order Summary Section */}
                    <div className="lg:w-1/3">
                        <div className="bg-white rounded border p-6 sticky top-8">

                            {/* Cart Summary Details */}
                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 text-xs">Number of Item(s)</span>
                                    <span className="font-medium text-xs">{cartItems.length} item(s)</span>
                                </div>
                                <div className="flex justify-between mt-8">
                                    <span className="text-gray-600 text-xs">Ships Within</span>
                                    <span className="font-medium text-xs">{cartSummary.shipsWithin}</span>
                                </div>
                                <div className="flex justify-between mt-8">
                                    <span className="text-gray-600 text-xs">Shipment Type</span>
                                    <span className="font-medium text-xs">{cartSummary.shipmentType}</span>
                                </div>
                                <div className="flex justify-between mt-8">
                                    <span className="text-gray-600 text-xs">Demo Period</span>
                                    <span className="font-medium text-xs">{cartSummary.demoPeriod}</span>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-6 space-y-4">
                            </div>

                            {/* Checkout Button */}
                            {
                                cartCount > 1 ? (
                                    <button
                                        className="w-full bg-[#35c8dc] text-white py-3 px-4 cursor-pointer font-semibold hover:bg-[#2db4c8] transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={true}
                                    >
                                        Proceed to Checkout
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleCheckout}
                                        className="w-full bg-[#35c8dc] text-white py-3 px-4 cursor-pointer font-semibold hover:bg-[#2db4c8] transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={isUpdating || cartItems.length === 0}
                                    >
                                        {isUpdating ? 'Processing...' : 'Proceed to Checkout'}
                                    </button>
                                )
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}