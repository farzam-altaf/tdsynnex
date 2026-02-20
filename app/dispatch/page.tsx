"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { Plus, Trash2, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function Page() {
    const { profile, isLoggedIn, loading, user } = useAuth();
    const router = useRouter();

    const [trackingNumber, setTrackingNumber] = useState("");
    const [shipmentDate, setShipmentDate] = useState("");

    const [items, setItems] = useState([
        { product_name: "", product_sku: "", product_quantity: 1, inventory_owner: "" },
    ]);

    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (loading) return;
        if (!isLoggedIn || !profile?.isVerified) {
            router.replace("/login?redirect_to=dispatch");
        }
    }, [loading, isLoggedIn, profile, router]);

    const addRow = () => {
        setItems((prev) => [
            ...prev,
            { product_name: "", product_sku: "", product_quantity: 1, inventory_owner: "" },
        ]);
    };

    const removeRow = (index: number) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: any) => {
        setItems((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    const handleSubmit = async () => {
        if (!user?.email) return;
        setSubmitting(true);

        try {
            const { data: submission, error: subError } = await supabase
                .from("dispatch_submissions")
                .insert({
                    submitted_by: user.email,
                    tracking_number: trackingNumber,
                    shipment_date: shipmentDate || null,
                })
                .select()
                .single();

            if (subError) throw subError;

            const payload = items.map((i) => ({
                submission_id: submission.id,
                product_name: i.product_name,
                product_sku: i.product_sku,
                product_quantity: i.product_quantity,
                inventory_owner: i.inventory_owner,
            }));

            const { error: itemError } = await supabase
                .from("dispatch_submission_items")
                .insert(payload);

            if (itemError) throw itemError;

            toast.success("Dispatch submitted successfully");

            setTrackingNumber("");
            setShipmentDate("");
            setItems([
                { product_name: "", product_sku: "", product_quantity: 1, inventory_owner: "" },
            ]);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isLoggedIn) return null;

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm p-8">
                    <h1 className="text-2xl font-semibold mb-2">Dispatched Devices</h1>
                    <p className="text-gray-500 mb-6">Submit shipment dispatch details</p>

                    {/* Address Card */}
                    <div className="mb-8 rounded-2xl border bg-gray-50 p-5 flex gap-4 items-start">
                        <div className="p-2 rounded-xl bg-white border">
                            <MapPin className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800 mb-1">
                                Send the devices on following address
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed">
                                Works360 LABS (TD SYNNEX SURFACE)<br />
                                15345 Anacapa Rd Unit A<br />
                                Victorville, CA 92392<br />
                                (442)255-4006
                            </p>
                        </div>
                    </div>

                    {/* Shipment Details */}
                    <div className="grid md:grid-cols-2 gap-4 mb-8">
                        <div>
                            <label className="text-sm text-gray-600">Submitted by</label>
                            <input
                                value={user?.email || ""}
                                disabled
                                className="mt-1 w-full border rounded-xl px-3 py-2 bg-gray-100 text-gray-600"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-600">Tracking #</label>
                            <input
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                className="mt-1 w-full border rounded-xl px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-600">Date of Shipment</label>
                            <input
                                type="date"
                                value={shipmentDate}
                                onChange={(e) => setShipmentDate(e.target.value)}
                                className="mt-1 w-full border rounded-xl px-3 py-2"
                            />
                        </div>
                    </div>

                    {/* Product Repeater */}
                    <div className="space-y-6">
                        {items.map((item, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="border rounded-2xl p-5 relative"
                            >
                                <div className="absolute top-3 right-3 flex items-center gap-2">
                                    {index === items.length - 1 && (
                                        <button
                                            onClick={addRow}
                                            className="flex items-center cursor-pointer gap-1 px-3 py-1 rounded-lg border text-sm"
                                        >
                                            <Plus size={14} /> Add
                                        </button>
                                    )}

                                    {items.length > 1 && (
                                        <button
                                            onClick={() => removeRow(index)}
                                            className="text-gray-400 hover:text-red-500 cursor-pointer"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-600">Product Name</label>
                                        <input
                                            value={item.product_name}
                                            onChange={(e) => updateItem(index, "product_name", e.target.value)}
                                            className="mt-1 w-full border rounded-xl px-3 py-2"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm text-gray-600">Product SKU #</label>
                                        <input
                                            value={item.product_sku}
                                            onChange={(e) => updateItem(index, "product_sku", e.target.value)}
                                            className="mt-1 w-full border rounded-xl px-3 py-2"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm text-gray-600">Product Quantity</label>
                                        <input
                                            type="number"
                                            value={item.product_quantity}
                                            onChange={(e) =>
                                                updateItem(index, "product_quantity", Number(e.target.value))
                                            }
                                            className="mt-1 w-full border rounded-xl px-3 py-2"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm text-gray-600">Inventory Owner</label>
                                        <input
                                            value={item.inventory_owner}
                                            onChange={(e) => updateItem(index, "inventory_owner", e.target.value)}
                                            className="mt-1 w-full border rounded-xl px-3 py-2"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end mt-6">
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="px-6 py-2 rounded-xl text-white cursor-pointer"
                            style={{ backgroundColor: "#0A4647" }}
                        >
                            {submitting ? "Submitting..." : "Submit"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
