import { supabase } from "@/lib/supabase/client";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    const { sku, stock } = await req.json();

    await supabase
        .from('products')
        .update({
            stock_quantity: String(stock),
            "isInStock": stock > 0,
            updated_at: new Date()
        })
        .eq('sku', sku)
        .eq('inventory_type', 'Global');

    return Response.json({ synced: true });
}
