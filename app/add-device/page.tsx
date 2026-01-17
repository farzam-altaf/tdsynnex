import { Suspense } from "react";
import AddDeviceClient from "./AddDeviceClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AddDeviceClient />
    </Suspense>
  );
}
