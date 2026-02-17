import { emailTemplates, sendEmail } from "@/lib/email";
import { ReturnReminderEmail, ShippedEmail } from "@/lib/emailconst";
import { supabase } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

const SHIPPED_STATUS = process.env.NEXT_PUBLIC_STATUS_SHIPPED;

export async function GET() {
  try {
    // Today date (YYYY-MM-DD)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch shipped orders
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("order_status", SHIPPED_STATUS)
      .not("shipped_date", "is", null);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    let sentCount = 0;

    for (const order of orders || []) {
      const shippedDate = new Date(order.shipped_date);
      shippedDate.setHours(0, 0, 0, 0);

      // diff in days
      const diffDays = Math.floor(
        (today.getTime() - shippedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // ✅ only 25th day
      if (diffDays !== 25) continue;

      // products mapping
      const productsForEmail = (order.products_array || []).map(
        (product: any, index: number) => ({
          name: product.product_name || `Product ${index + 1}`,
          quantity: order.quantities_array?.[index] || 0,
        })
      );

      const totalQuantity = productsForEmail.reduce(
        (sum: number, p: any) => sum + p.quantity,
        0
      );

      const template = emailTemplates.shippedReminderEmail({
        orderNumber: order.order_no,
        orderDate: order.order_date,
        customerName: order.contact_name || "Customer",
        customerEmail: order.order_by_user?.email,
        shippedDate: order.shipped_date,

        products: productsForEmail,
        totalQuantity,

        orderTracking: order.tracking || "",
        orderTrackingLink: order.tracking_link || "",
        returnTracking: order.return_tracking || "",
        returnTrackingLink: order.return_tracking_link || "",
        caseType: order.case_type || "",
        fileLink: order.return_label || "",

        salesExecutive: order.sales_executive || "",
        salesExecutiveEmail: order.se_email || "",
        salesManager: order.sales_manager || "",
        salesManagerEmail: order.sm_email || "",
        reseller: order.reseller || "",

        companyName: order.company_name || "",
        contactName: order.contact_name || "",
        contactEmail: order.email || "",
        shippingAddress: order.address || "",
        city: order.city || "",
        state: order.state || "",
        zip: order.zip || "",
        deliveryDate: order.desired_date || "",

        deviceUnits: order.dev_opportunity || 0,
        budgetPerDevice: order.dev_budget || 0,
        revenue: order.rev_opportunity || 0,
        crmAccount: order.crm_account || "",
        vertical: order.vertical || "",
        segment: order.segment || "",
        useCase: order.use_case || "",
        currentDevices: order.currently_running || "",
        licenses: order.licenses || "",
        usingCopilot: order.isCopilot || "",
        securityFactor: order.isSecurity || "",
        deviceProtection: order.current_protection || "",

        note: order.notes || "",
      });

      const mergedEmails = [
        order.order_by_user?.email,
        ...ReturnReminderEmail,
      ].filter(Boolean);

      await sendEmail({
        to: mergedEmails,
        cc: "",
        subject: template.subject,
        text: template.text,
        html: template.html,
      });

      sentCount++;
    }

    return NextResponse.json({
      success: true,
      message: `25-day reminder emails sent: ${sentCount}`,
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    );
  }
}