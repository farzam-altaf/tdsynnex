import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { emailTemplates, sendCronEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
    try {
        console.log("🚀 Starting automatic overdue orders reminder cron...");

        const shippedStatus = process.env.NEXT_PUBLIC_STATUS_SHIPPED;
        if (!shippedStatus) {
            throw new Error("Shipping status environment variable not set");
        }

        const today = new Date();
        const todayString = today.toISOString().split('T')[0];

        // 1️⃣ Get ALL shipped orders
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select(`
                *,
                users:order_by (
                    id,
                    email
                ),
                products:product_id (
                    id,
                    product_name,
                    slug
                )
            `)
            .eq('order_status', shippedStatus)
            .not('shipped_date', 'is', null);

        if (ordersError) throw ordersError;

        if (!orders || orders.length === 0) {
            console.log("ℹ️ No shipped orders found");
            return NextResponse.json({ 
                success: true, 
                remindersSent: 0,
                message: "No shipped orders found" 
            });
        }

        console.log(`👥 Found ${orders.length} shipped orders`);

        let sent = 0;
        let skipped = 0;
        let errors = 0;

        // Helper function to calculate days difference
        const calculateDaysDifference = (date1: Date, date2: Date): number => {
            const diffTime = Math.abs(date2.getTime() - date1.getTime());
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        };

        // Helper function to extract reminder info from notes
        const extractReminderInfo = (notes: string | null) => {
            if (!notes) return { lastReminderDate: null, reminderCount: 0 };
            
            const lines = notes.split('\n');
            let lastReminderDate = null;
            let reminderCount = 0;
            
            // Find the last reminder entry
            for (const line of lines) {
                if (line.includes('[Auto-reminder')) {
                    const match = line.match(/\[Auto-reminder #(\d+) sent on (.+?) -/);
                    if (match) {
                        reminderCount = parseInt(match[1]);
                        lastReminderDate = new Date(match[2].trim());
                    }
                }
            }
            
            return { lastReminderDate, reminderCount };
        };

        // 2️⃣ Process each order
        for (const order of orders) {
            try {
                // Skip if no shipped date
                if (!order.shipped_date) {
                    skipped++;
                    continue;
                }

                // Calculate days since shipped
                const shippedDate = new Date(order.shipped_date);
                const daysSinceShipped = calculateDaysDifference(shippedDate, today);
                
                // Skip if less than 45 days
                if (daysSinceShipped < 45) {
                    console.log(`⏳ Skipping order #${order.order_no}: ${daysSinceShipped} days shipped (less than 45)`);
                    skipped++;
                    continue;
                }

                // Check if user has email
                if (!order.users?.email) {
                    console.log(`⚠️ No email found for order #${order.order_no}`);
                    continue;
                }

                // Extract reminder info from notes
                const { lastReminderDate, reminderCount } = extractReminderInfo(order.notes);
                
                let shouldSendReminder = false;
                let newReminderCount = reminderCount;

                if (!lastReminderDate) {
                    // First reminder - send immediately if 45+ days
                    shouldSendReminder = true;
                    newReminderCount = 1;
                } else {
                    // Check if 10 days have passed since last reminder
                    const daysSinceLastReminder = calculateDaysDifference(lastReminderDate, today);
                    
                    if (daysSinceLastReminder >= 10) {
                        shouldSendReminder = true;
                        newReminderCount = reminderCount + 1;
                    }
                }

                if (!shouldSendReminder) {
                    console.log(`⏳ Not time for reminder yet for order #${order.order_no}`);
                    skipped++;
                    continue;
                }

                // 3️⃣ Prepare email data
                const productName = order.products?.product_name || "Standard Device Package";
                const productSlug = order.products?.slug || "#";

                const emailData = {
                    orderNumber: order.order_no,
                    orderDate: new Date(order.order_date).toLocaleDateString(),
                    productName: productName,
                    productSlug: productSlug,
                    quantity: 1,
                    returnTracking: order.return_tracking || "Not provided yet",
                    fileLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://tdsynnex.vercel.app"}`,
                    salesExecutive: order.sales_executive || "N/A",
                    salesExecutiveEmail: order.se_email || "N/A",
                    salesManager: order.sales_manager || "N/A",
                    salesManagerEmail: order.sm_email || "N/A",
                    companyName: order.company_name || "N/A",
                    contactEmail: order.email || "N/A",
                    shippedDate: new Date(order.shipped_date).toLocaleDateString(),
                    customerName: order.company_name || "Customer",
                    customerEmail: order.users.email
                };

                // 4️⃣ Get email template (using your existing template)
                const template = emailTemplates.returnReminderEmail({
                    orderNumber: emailData.orderNumber,
                    orderDate: emailData.orderDate,
                    customerName: emailData.customerName,
                    customerEmail: emailData.customerEmail,
                    productName: emailData.productName,
                    productSlug: emailData.productSlug,
                    quantity: emailData.quantity,
                    returnTracking: emailData.returnTracking,
                    fileLink: emailData.fileLink,
                    salesExecutive: emailData.salesExecutive,
                    salesExecutiveEmail: emailData.salesExecutiveEmail,
                    salesManager: emailData.salesManager,
                    salesManagerEmail: emailData.salesManagerEmail,
                    companyName: emailData.companyName,
                    contactEmail: emailData.contactEmail,
                    shippedDate: emailData.shippedDate
                });

                // 5️⃣ Send email
                await sendCronEmail({
                    to: order.users.email,
                    subject: template.subject,
                    text: template.text,
                    html: template.html,
                });

                console.log(`📧 Email #${newReminderCount} sent to ${order.users.email} for order #${order.order_no} (${daysSinceShipped} days shipped)`);

            } catch (err: any) {
                console.error(`❌ Failed for order #${order.order_no}:`, err.message || err);
                errors++;
            }
        }

        console.log("📊 Automatic overdue reminders cron completed", { 
            total: orders.length, 
            sent, 
            skipped, 
            errors 
        });

        return NextResponse.json({
            success: true,
            remindersSent: sent,
            skipped,
            errors,
            timestamp: todayString,
        });

    } catch (error: any) {
        console.error("❌ Cron job failed:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}