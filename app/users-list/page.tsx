import { Suspense } from "react";
import UsersList from "./users-list";

export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <UsersList />
        </Suspense>
    );
}