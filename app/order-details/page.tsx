import { Suspense } from "react";
import OrderDetails from "./detail";

export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <OrderDetails />
        </Suspense>
    );
}