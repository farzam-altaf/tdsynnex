import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { emailTemplates, sendCronEmail } from "@/lib/email";
import { logEmail } from "@/lib/logger";

const CRON_SECRET = process.env.CRON_SECRET!;

export async function GET(request: NextRequest) {
  try {

    console.log("✅ Starting waitlist-based back-in-stock cron...");

    // 1️⃣ Get ALL waitlist entries
    const { data: waitlist, error: waitlistError } = await supabase
      .from("waitlist")
      .select("id, email, product_id");

    if (waitlistError) throw waitlistError;

    if (!waitlist || waitlist.length === 0) {
      console.log("ℹ️ No waitlist entries found");
      return NextResponse.json({ success: true, notificationsSent: 0 });
    }

    console.log(`👥 Found ${waitlist.length} waitlist entries`);

    let sent = 0;
    let errors = 0;

    // 2️⃣ Process each waitlist entry
    for (const entry of waitlist) {
      try {
        // 3️⃣ Fetch product for this waitlist entry
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("id, product_name, sku, stock_quantity, slug")
          .eq("id", entry.product_id)
          .single();

        if (productError || !product) {
          console.log("⚠️ Product not found for waitlist entry:", entry.id);
          continue;
        }

        // 4️⃣ Check stock
        if (product.stock_quantity <= 0) {
          console.log(`⏳ Still out of stock: ${product.product_name}`);
          continue;
        }

        // 5️⃣ Send email
        const productUrl = `${process.env.NEXT_PUBLIC_APP_URL}/product/${product.slug}`;

        const template = emailTemplates.backInStockEmail({
          product: product.product_name,
          sku: product.sku,
          email: entry.email,
          productUrl,
        });

        const emailResult = await sendCronEmail({
          to: entry.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });

        if (emailResult.success) {
          // Log email sent to database
          await logEmail(
            'back_in_stock_notification_sent',
            `Back-in-stock notification sent for ${product.product_name}`,
            `null`, // userId is null for cron jobs
            {
              waitlistId: entry.id,
              productId: product.id,
              productName: product.product_name,
              productSKU: product.sku,
              customerEmail: entry.email,
              stockQuantity: product.stock_quantity,
              emailSubject: template.subject,
              productUrl: productUrl
            },
            'sent',
            '/api/cron/run' // Source path
          );

          console.log(`📧 Email sent to ${entry.email} for ${product.product_name}`);
        } else {
          // Log email send failure
          await logEmail(
            'back_in_stock_notification_failed',
            `Failed to send back-in-stock notification for ${product.product_name}`,
            `null`,
            {
              waitlistId: entry.id,
              productId: product.id,
              productName: product.product_name,
              customerEmail: entry.email,
              error: emailResult.error
            },
            'failed',
            '/api/cron/run'
          );

          errors++;
          console.error(`❌ Email send failed for ${entry.email}:`, emailResult.error);
          continue;
        }

        // 6️⃣ Remove from waitlist
        await supabase
          .from("waitlist")
          .delete()
          .eq("id", entry.id);

        sent++;

      } catch (err) {
        console.error("❌ Failed for waitlist entry:", entry.id, err);
        errors++;
      }
    }

    console.log("📊 Cron completed", { sent, errors });

    return NextResponse.json({
      success: true,
      notificationsSent: sent,
      errors,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error("❌ Cron job failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
