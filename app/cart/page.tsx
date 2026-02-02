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
import { logActivity, logError, logSuccess, logInfo, logWarning } from "@/lib/logger";

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
    const [debugInfo, setDebugInfo] = useState<string>(''); // For debugging

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
            return;
        }
        setAuthInitialized(true);

        // Now check authentication status
        if (!isLoggedIn || profile?.isVerified === false && !profile) {
            logActivity({
                type: 'auth',
                level: 'warning',
                action: 'unauthorized_cart_access_attempt',
                message: 'User attempted to access cart without proper authentication',
                userId: profile?.id || null,
                details: {
                    isLoggedIn,
                    isVerified: profile?.isVerified,
                    userRole: profile?.role
                },
                status: 'failed'
            });
            router.replace('/login/?redirect_to=cart');
        } else {
            setAuthChecked(true);
            logActivity({
                type: 'ui',
                level: 'info',
                action: 'cart_page_accessed',
                message: 'User accessed cart page',
                userId: profile?.id || null,
                details: {
                    userRole: profile?.role,
                    email: profile?.email,
                    cartCountOnAccess: cartCount
                },
                status: 'completed'
            });
        }
    }, [loading, isLoggedIn, profile, user, router]);

    // Fetch data only after auth is confirmed AND initialized
    useEffect(() => {
        if (!authChecked || !authInitialized) {
            return; // Don't fetch data until auth is fully checked AND initialized
        }
    }, [authChecked, authInitialized]);

    const [quantityInputValues, setQuantityInputValues] = useState<Record<string, string>>({});
    const [editingProductId, setEditingProductId] = useState<string | null>(null);

    useEffect(() => {
        if (cartItems.length > 0) {
            const initialValues: Record<string, string> = {};
            cartItems.forEach(item => {
                initialValues[item.product_id] = item.quantity.toString();
            });
            setQuantityInputValues(initialValues);
        }
    }, [cartItems]);

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

    // Save quantity handler - SIMPLIFIED VERSION
    const handleSaveQuantity = async (productId: string, newQuantity: number) => {
        console.log('handleSaveQuantity called:', { productId, newQuantity });

        if (newQuantity < 1) return;

        // Get current item to check stock
        const currentItem = cartItems.find(item => item.product_id === productId);
        const stockQuantity = currentItem?.product?.stock_quantity || 0;

        // Validate against stock if stock information is available
        if (stockQuantity > 0 && newQuantity > stockQuantity) {
            newQuantity = stockQuantity; // Cap at stock quantity
        }

        try {
            console.log('Calling updateQuantity:', { productId, newQuantity });
            await updateQuantity(productId, newQuantity);

            // Update the input value
            setQuantityInputValues(prev => ({
                ...prev,
                [productId]: newQuantity.toString()
            }));

            setEditingProductId(null);
            console.log('Quantity updated successfully');
        } catch (error) {
            console.error('Error updating quantity:', error);
            // Revert to original value on error
            if (currentItem) {
                setQuantityInputValues(prev => ({
                    ...prev,
                    [productId]: currentItem.quantity.toString()
                }));
            }
        }
    };

    const handleIncreaseQuantity = async (productId: string) => {
        console.log('handleIncreaseQuantity called:', productId);
        const currentItem = cartItems.find(item => item.product_id === productId);
        if (!currentItem) {
            console.log('Item not found:', productId);
            return;
        }

        const newQuantity = currentItem.quantity + 1;
        console.log('Increasing quantity:', { current: currentItem.quantity, new: newQuantity });

        // Call the simplified save function
        await handleSaveQuantity(productId, newQuantity);
    };

    const handleDecreaseQuantity = async (productId: string) => {
        console.log('handleDecreaseQuantity called:', productId);
        const currentItem = cartItems.find(item => item.product_id === productId);
        if (!currentItem || currentItem.quantity <= 1) {
            console.log('Cannot decrease:', { currentQuantity: currentItem?.quantity });
            return;
        }

        const newQuantity = currentItem.quantity - 1;
        console.log('Decreasing quantity:', { current: currentItem.quantity, new: newQuantity });

        // Call the simplified save function
        await handleSaveQuantity(productId, newQuantity);
    };

    // Handle Enter key in input field
    const handleInputSave = async (productId: string) => {
        const inputValue = quantityInputValues[productId];
        if (!inputValue || inputValue.trim() === '') return;

        const numericValue = parseInt(inputValue);
        if (isNaN(numericValue) || numericValue < 1) return;

        await handleSaveQuantity(productId, numericValue);
    };

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
        logActivity({
            type: 'navigation',
            level: 'info',
            action: 'checkout_initiated',
            message: 'User initiated checkout from cart',
            userId: profile?.id || null,
            details: {
                cartItemCount: cartItems.length,
                cartCount,
                totalItems: getCartTotalItems(),
                totalAmount: getCartTotal(),
                items: cartItems.map(item => ({
                    productId: item.product_id,
                    productName: item.product?.product_name,
                    sku: item.product?.sku
                }))
            },
            status: 'completed'
        });

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
        logActivity({
            type: 'cart',
            level: 'info',
            action: 'empty_cart_viewed',
            message: 'User viewed empty cart',
            userId: profile?.id || null,
            details: {
                userRole: profile?.role,
                email: profile?.email
            },
            status: 'completed'
        });
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
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Cart</h1>
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

                                            {/* Quantity Controls */}
                                            <div className="flex items-center space-x-4 mb-4">
                                                <div className="flex items-center space-x-2">
                                                    {/* Minus Button */}
                                                    <button
                                                        onClick={() => handleDecreaseQuantity(item.product_id)}
                                                        disabled={isUpdating || item.quantity <= 1}
                                                        className={`w-7 h-7 cursor-pointer flex items-center justify-center border border-gray-300 rounded-md transition-colors
          ${isUpdating || item.quantity <= 1
                                                                ? 'opacity-50 cursor-not-allowed text-gray-400'
                                                                : 'hover:bg-gray-100 hover:border-gray-400 text-gray-700'
                                                            }`}
                                                    >
                                                        −
                                                    </button>

                                                    {/* Quantity Input Field */}
                                                    <div className="relative">
                                                        <div className="flex items-center space-x-2">
                                                            {/* Input field */}
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={item.product?.stock_quantity || undefined}
                                                                value={quantityInputValues[item.product_id] !== undefined
                                                                    ? quantityInputValues[item.product_id]
                                                                    : item.quantity.toString()}
                                                                onChange={(e) => handleQuantityInputChange(item.product_id, e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        handleInputSave(item.product_id);
                                                                    }
                                                                }}
                                                                onBlur={() => {
                                                                    const inputValue = parseInt(quantityInputValues[item.product_id] || item.quantity.toString());
                                                                    if (!isNaN(inputValue) && inputValue >= 1) {
                                                                        handleInputSave(item.product_id);
                                                                    }
                                                                }}
                                                                disabled={isUpdating}
                                                                className="w-16 text-center border border-gray-300 rounded-md py-1.5 px-2 text-sm 
                                                                focus:outline-none focus:ring-1 focus:ring-[#35c8dc] focus:border-[#35c8dc]
                                                                disabled:opacity-50 disabled:cursor-not-allowed
                                                                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                                                                transition-all duration-200"
                                                            />

                                                            {/* Save Button - Only show when editing this product */}
                                                            {editingProductId === item.product_id && (
                                                                <button
                                                                    onClick={() => handleInputSave(item.product_id)}
                                                                    disabled={isUpdating}
                                                                    className="w-7 h-7 flex items-center justify-center bg-[#35c8dc] text-white rounded-md hover:bg-[#2db4c8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    title="Save quantity"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Stock limit warning */}
                                                        {item.product?.stock_quantity &&
                                                            parseInt(quantityInputValues[item.product_id] || item.quantity.toString()) > item.product.stock_quantity && (
                                                                <div className="absolute -bottom-5 left-0 right-0 text-xs text-red-500 font-medium text-center">
                                                                    Max: {item.product.stock_quantity}
                                                                </div>
                                                            )}
                                                    </div>

                                                    {/* Plus Button */}
                                                    <button
                                                        onClick={() => handleIncreaseQuantity(item.product_id)}
                                                        disabled={
                                                            isUpdating ||
                                                            (typeof item.product?.stock_quantity === 'number' && item.quantity >= item.product.stock_quantity)
                                                        }
                                                        className={`w-7 h-7 cursor-pointer flex items-center justify-center border border-gray-300 rounded-md transition-colors
          ${isUpdating || (item.product?.stock_quantity && item.quantity >= item.product.stock_quantity)
                                                                ? 'opacity-50 cursor-not-allowed text-gray-400'
                                                                : 'hover:bg-gray-100 hover:border-gray-400 text-gray-700'
                                                            }`}
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                {/* Stock Status */}
                                                {item.product?.stock_quantity && (
                                                    <div className="text-xs">
                                                        {item.product.stock_quantity === 0 ? (
                                                            <span className="text-red-500 font-medium">Out of stock</span>
                                                        ) : item.quantity >= item.product.stock_quantity ? (
                                                            <span className="text-amber-600 font-medium">
                                                                Only {item.product.stock_quantity} left
                                                            </span>
                                                        ) : item.product.stock_quantity < 10 ? (
                                                            <span className="text-green-600">
                                                                {item.product.stock_quantity} in stock
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                )}

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

                            <button
                                onClick={handleCheckout}
                                className="w-full bg-[#35c8dc] text-white py-3 px-4 cursor-pointer font-semibold hover:bg-[#2db4c8] transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isUpdating || cartItems.length === 0}
                            >
                                {isUpdating ? 'Processing...' : 'Proceed to Checkout'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}