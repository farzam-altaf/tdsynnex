import { Suspense } from "react";
import ThankYouComp from "./ThanksComponent";

export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ThankYouComp />
        </Suspense>
    );
}