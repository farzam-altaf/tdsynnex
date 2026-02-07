import { supabase } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {

    if (req.headers.get('x-wgss-source') !== 'woo') {
        return new Response('Unauthorized', { status: 401 });
    }

    const { sku, qty } = await req.json();

    const { data } = await supabase
        .from('inventory')
        .select('id')
        .eq('sku', sku)
        .eq('inventory_type', 'Global')
        .eq('isBundle', false)
        .single();

    if (!data) {
        return Response.json({ ignored: true });
    }

    await supabase.rpc('reduce_product_stock', {
        p_sku: sku,
        p_qty: qty
    });

    return Response.json({ reduced: true });
}
