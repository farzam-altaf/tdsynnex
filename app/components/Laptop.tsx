import Image from "next/image";
import Link from "next/link";

export default function Laptop() {
    return (
        <div className="relative w-full overflow-hidden py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                {/* Laptop grid */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">

                    {/* First Laptop - Full width on mobile, half on desktop */}
                    <div className="group sm:my-24">
                        <div className="text-center">
                            <h2 className="mb-3 text-2xl font-bold text-gray-900 sm:text-3xl">
                                Meet The Family
                            </h2>
                            <p className="mb-6 mx-auto text-gray-600 max-w-md">
                                Incredible speed and battery life come together with game-changing AI experiences and signature Surface design.
                            </p>
                        </div>
                        <div className="mb-8 text-center">
                            <Image
                                src="/laptop1.png"
                                alt="Surface Laptop"
                                width={600}
                                height={400}
                                className="mx-auto h-auto w-full max-w-8xl"
                                priority
                            />
                        </div>
                        <div className="text-center">
                            <h2 className="mb-3 text-2xl font-bold text-gray-900 sm:text-3xl">
                                Surface 2-in-1 PCs
                            </h2>
                            <p className="mb-6 text-gray-600">
                                Power, adaptability and flexibility – This is Surface Pro.
                            </p>
                            <Link
                                href="/product-category/2in1s?form_factor=2in1s"
                                className="inline-flex items-center text-[#3ba1da] font-semibold hover:text-[#41abd6] transition-colors"
                            >
                                Explore Surface 2-in-1 PCs
                                <svg
                                    className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </Link>
                        </div>
                    </div>

                    {/* Second and Third Laptops - Stacked on right side */}
                    <div className="space-y-12 lg:space-y-16">

                        {/* Second Laptop */}
                        <div className="group">
                            <div className="mb-8 text-center">
                                <Image
                                    src="/laptop2.png"
                                    alt="Surface Pro"
                                    width={600}
                                    height={400}
                                    className="mx-auto h-auto w-full max-w-4xl"
                                    priority
                                />
                            </div>
                            <div className="text-center">
                                <h2 className="mb-3 text-2xl font-bold text-gray-900 sm:text-3xl">
                                    Surface Laptops
                                </h2>
                                <p className="mb-6 text-gray-600">
                                    Style, speed and power in ultra-premium Surface laptops designs.
                                </p>
                                <Link
                                    href="/product-category/notebooks?form_factor=Notebooks"
                                    className="inline-flex items-center text-[#3ba1da] font-semibold hover:text-[#41abd6] transition-colors"
                                >
                                    See All Surface Laptops
                                    <svg
                                        className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </Link>
                            </div>
                        </div>

                        {/* Third Laptop */}
                        <div className="group">
                            <div className="mb-8 text-center">
                                <Image
                                    src="/laptop3.png"
                                    alt="Surface Studio"
                                    width={600}
                                    height={400}
                                    className="mx-auto h-auto w-full max-w-4xl"
                                    priority
                                />
                            </div>
                            <div className="text-center">
                                <Link
                                    href="/product-category/alldevices"
                                    className="inline-flex items-center text-[#3ba1da] font-semibold hover:text-[#41abd6] transition-colors"
                                >
                                    All Devices
                                    <svg
                                        className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </Link>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}