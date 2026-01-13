import Link from "next/link";

export default function NotFound() {
    return (
        <main className="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8 h-[83vh]">
            <div className="text-center">
                <p className="text-base font-semibold text-[#2db4c8]">404</p>
                <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance sm:text-7xl font-inter">
                    Page not found
                </h1>
                <p className="mt-6 text-lg font-medium text-pretty text-gray-400 sm:text-xl/8">
                    Sorry, we couldn’t find the page you’re looking for.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <Link
                        href="/"
                        className="rounded-md border border-[#2db4c8] px-3.5 py-2.5 text-sm font-semibold text-[#2db4c8] shadow-xs  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                    >
                        Go back home
                    </Link>
                </div>
            </div>
        </main>
    )
}
