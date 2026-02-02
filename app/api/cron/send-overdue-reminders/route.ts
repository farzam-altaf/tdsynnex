import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { emailTemplates, sendCronEmail } from "@/lib/email";
import { logActivity, logEmail } from "@/lib/logger";

export async function GET(request: NextRequest) {
    try {
        console.log("🚀 Starting automatic overdue orders reminder cron...");

        const shippedStatus = process.env.NEXT_PUBLIC_STATUS_SHIPPED;
        if (!shippedStatus) {
            throw new Error("Shipping status environment variable not set");
        }

        const today = new Date();
        const todayString = today.toISOString().split('T')[0];

        // 1️⃣ Get ALL shipped orders with their order items
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select(`
                *,
                users:order_by (
                    id,
                    email
                ),
                order_items (
                    id,
                    product_id,
                    quantity,
                    products (
                        id,
                        product_name,
                        slug
                    )
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

        // Helper function to format products list for email
        const formatProductsList = (orderItems: any[]) => {
            if (!orderItems || orderItems.length === 0) {
                return {
                    text: "No products found",
                    html: "No products found",
                    totalQuantity: 0,
                    productNames: []
                };
            }

            // Group products by name and sum quantities
            const productMap = new Map();

            orderItems.forEach(item => {
                const productName = item.products?.product_name || "Unknown Product";
                const productSlug = item.products?.slug || "#";
                const quantity = item.quantity || 1;

                if (productMap.has(productName)) {
                    const existing = productMap.get(productName);
                    existing.quantity += quantity;
                } else {
                    productMap.set(productName, {
                        name: productName,
                        slug: productSlug,
                        quantity: quantity
                    });
                }
            });

            const products = Array.from(productMap.values());
            const totalQuantity = products.reduce((sum, product) => sum + product.quantity, 0);
            const productNames = products.map(p => p.name);

            // Generate text version
            const textLines = products.map(product =>
                `${product.name} (Qty: ${product.quantity})`
            ).join('\n');

            // Generate HTML version
            const htmlRows = products.map(product => `
                <tr>
                    <td style="padding:10px; border:1px solid #ddd;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/product/${product.slug}">
                            ${product.name}
                        </a>
                    </td>
                    <td style="padding:10px; border:1px solid #ddd; text-align:center;">
                        ${product.quantity}
                    </td>
                </tr>
            `).join('');

            return {
                text: textLines,
                html: htmlRows,
                totalQuantity,
                productNames
            };
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

                // Format products list
                const productsList = formatProductsList(order.order_items || []);

                // 3️⃣ Prepare email data
                const emailData = {
                    orderNumber: order.order_no,
                    orderDate: new Date(order.order_date).toLocaleDateString(),
                    productName: productsList.productNames.length > 0
                        ? productsList.productNames.join(', ')
                        : "Standard Device Package",
                    productListText: productsList.text,
                    productListHtml: productsList.html,
                    totalQuantity: productsList.totalQuantity,
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

                // 4️⃣ Get email template (using modified template for multiple products)
                const template = emailTemplates.returnReminderEmail({
                    orderNumber: emailData.orderNumber,
                    orderDate: emailData.orderDate,
                    customerName: emailData.customerName,
                    customerEmail: emailData.customerEmail,
                    productName: emailData.productName,
                    productListText: emailData.productListText,
                    productListHtml: emailData.productListHtml,
                    totalQuantity: emailData.totalQuantity,
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
                const emailResult = await sendCronEmail({
                    to: order.users.email,
                    subject: template.subject,
                    text: template.text,
                    html: template.html,
                });

                if (emailResult.success) {
                    // Update order notes with reminder sent info
                    const newNote = `${order.notes ? order.notes + '\n' : ''}[Auto-reminder #${newReminderCount} sent on ${today.toLocaleDateString()} - ${daysSinceShipped} days after shipping]`;

                    await supabase
                        .from('orders')
                        .update({ notes: newNote })
                        .eq('id', order.id);

                    // Log to database
                    await logEmail(
                        'overdue_reminder_sent',
                        `Return reminder #${newReminderCount} sent for order #${order.order_no}`,
                        order.users?.id || null,
                        {
                            orderId: order.id,
                            orderNumber: order.order_no,
                            customerEmail: order.users.email,
                            daysSinceShipped: daysSinceShipped,
                            reminderNumber: newReminderCount,
                            lastReminderDate: lastReminderDate,
                            productCount: (order.order_items || []).length,
                            totalQuantity: productsList.totalQuantity,
                            productNames: productsList.productNames,
                            emailSubject: template.subject,
                            shippedDate: order.shipped_date
                        },
                        'sent',
                        '/api/cron/send-overdue-reminders' // Source path
                    );

                    sent++;
                    console.log(`📧 Email #${newReminderCount} sent to ${order.users.email} for order #${order.order_no} (${daysSinceShipped} days shipped, ${productsList.totalQuantity} items)`);
                } else {
                    // Log email send failure
                    await logEmail(
                        'overdue_reminder_failed',
                        `Failed to send return reminder for order #${order.order_no}`,
                        order.users?.id || null,
                        {
                            orderId: order.id,
                            orderNumber: order.order_no,
                            customerEmail: order.users.email,
                            error: emailResult.error,
                            daysSinceShipped: daysSinceShipped,
                            reminderNumber: newReminderCount
                        },
                        'failed',
                        '/api/cron/send-overdue-reminders'
                    );

                    errors++;
                    console.error(`❌ Email send failed for order #${order.order_no}:`, emailResult.error);
                }

            } catch (err: any) {
                await logActivity({
                    type: 'email',
                    level: 'error',
                    action: 'overdue_reminder_processing_error',
                    message: `Failed to process reminder for order #${order.order_no}`,
                    userId: order.users?.id || null,
                    details: {
                        orderId: order.id,
                        orderNumber: order.order_no,
                        error: err.message || err,
                        shippedDate: order.shipped_date
                    },
                    status: 'failed',
                    source: '/api/cron/send-overdue-reminders'
                });
                console.error(`❌ Failed for order #${order.order_no}:`, err.message || err);
                errors++;
            }
        }

        await logActivity({
            type: 'cron',
            level: 'info',
            action: 'overdue_reminders_cron_completed',
            message: `Automatic overdue reminders cron completed successfully`,
            userId: null,
            details: {
                totalOrdersProcessed: orders.length,
                emailsSent: sent,
                ordersSkipped: skipped,
                errors: errors,
                executionDate: todayString
            },
            status: 'completed',
            source: '/api/cron/send-overdue-reminders'
        });

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
        await logActivity({
            type: 'cron',
            level: 'error',
            action: 'overdue_reminders_cron_failed',
            message: 'Automatic overdue reminders cron job failed',
            userId: null,
            details: {
                error: error.message || error,
                stack: error.stack
            },
            status: 'failed',
            source: '/api/cron/send-overdue-reminders'
        });
        console.error("❌ Cron job failed:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}