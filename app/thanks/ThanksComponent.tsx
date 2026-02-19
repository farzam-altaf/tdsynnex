// app/thank-you/page.tsx
"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Package, Clock, Home, ShoppingBag, Trophy, Star, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function ThankYouComp() {
    const searchParams = useSearchParams()
    const [orderNumber, setOrderNumber] = useState<string | null>(null)
    const [orderDate, setOrderDate] = useState<string>('')
    const [isWinReport, setIsWinReport] = useState<boolean>(false)

    useEffect(() => {
        // Check if URL has ?_=thanks parameter
        const thanksParam = searchParams.get('_')
        setIsWinReport(thanksParam === 'thanks')

        // Set current date and time
        const now = new Date()
        setOrderDate(now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }))

        // Generate a random order number (in real app, this would come from your order system)
        const randomOrderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000)
        setOrderNumber(randomOrderNumber)
    }, [searchParams])

    // Default content for normal orders
    const renderOrderContent = () => (
        <>
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-3">
                    Thank You for Your Order!
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Your order has been successfully placed and is being processed.
                    We've sent a confirmation email with all the details.
                </p>
            </div>
        </>
    )

    // Win Report content for ?_=thanks parameter
    const renderWinContent = () => (
        <>
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-3">
                    Congratulations on Your Win!
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Win Reported Successfully
                </p>
            </div>
        </>
    )

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-8">
            <div className="w-full max-w-4xl">
                {/* Render based on URL parameter */}
                {isWinReport ? renderWinContent() : renderOrderContent()}
            </div>
        </div>
    )
}