"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { createClient } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";


export default function Page() {
    const { profile, isLoggedIn, loading, user } = useAuth();
    const router = useRouter();

    const [items, setItems] = useState([
        { product_name: "", sku: "", quantity: 1, address: "", additional_note: "" },
    ]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (loading) return;
        if (!isLoggedIn || !profile?.isVerified) {
            router.replace("/login?redirect_to=eol");
        }
    }, [loading, isLoggedIn, profile, router]);

    const addRow = () => {
        setItems((prev) => [
            ...prev,
            { product_name: "", sku: "", quantity: 1, address: "", additional_note: "" },
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
            // 1️⃣ create submission
            const { data: submission, error: subError } = await supabase
                .from("eol_submissions")
                .insert({ submitted_by: user.email })
                .select()
                .single();

            if (subError) throw subError;

            // 2️⃣ insert items
            const payload = items.map((i) => ({
                submission_id: submission.id,
                product_name: i.product_name,
                sku: i.sku,
                quantity: i.quantity,
                address: i.address,
                additional_note: i.additional_note,
            }));

            const { error: itemError } = await supabase
                .from("eol_submission_items")
                .insert(payload);

            if (itemError) throw itemError;

            toast.success("EOL request submitted successfully");
            setItems([
                { product_name: "", sku: "", quantity: 1, address: "", additional_note: "" },
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
                    <h1 className="text-2xl font-semibold mb-2">EOL Devices</h1>
                    <p className="text-gray-500 mb-6">
                        Submit end-of-life devices for processing
                    </p>

                    {/* Submitted by */}
                    <div className="mb-8">
                        <label className="text-sm text-gray-600">Submitted by</label>
                        <input
                            value={user?.email || ""}
                            disabled
                            className="mt-1 w-full border rounded-xl px-3 py-2 bg-gray-100 text-gray-600"
                        />
                    </div>

                    {/* Repeater */}
                    <div className="space-y-6">
                        {items.map((item, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="border rounded-2xl p-5 relative"
                            >
                                {/* Top right actions */}
                                <div className="absolute top-3 right-3 flex items-center gap-2">
                                    {index === items.length - 1 && (
                                        <button
                                            onClick={addRow}
                                            className="flex items-center gap-1 px-3 py-1 cursor-pointer rounded-lg border text-sm"
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
                                            onChange={(e) =>
                                                updateItem(index, "product_name", e.target.value)
                                            }
                                            className="mt-1 w-full border rounded-xl px-3 py-2"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm text-gray-600">SKU</label>
                                        <input
                                            value={item.sku}
                                            onChange={(e) => updateItem(index, "sku", e.target.value)}
                                            className="mt-1 w-full border rounded-xl px-3 py-2"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm text-gray-600">Quantity</label>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) =>
                                                updateItem(index, "quantity", Number(e.target.value))
                                            }
                                            className="mt-1 w-full border rounded-xl px-3 py-2"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm text-gray-600">Address</label>
                                        <input
                                            value={item.address}
                                            onChange={(e) =>
                                                updateItem(index, "address", e.target.value)
                                            }
                                            className="mt-1 w-full border rounded-xl px-3 py-2"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="text-sm text-gray-600">
                                        Additional Note
                                    </label>
                                    <textarea
                                        value={item.additional_note}
                                        onChange={(e) =>
                                            updateItem(index, "additional_note", e.target.value)
                                        }
                                        className="mt-1 w-full border rounded-xl px-3 py-2"
                                        rows={3}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end mt-6">
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
