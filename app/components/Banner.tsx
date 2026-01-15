import Image from "next/image";
import Link from "next/link";

export default function Banner() {
  return (
    <div className="relative w-full overflow-hidden">
      {/* Using grid for perfect centering */}
      <div className="relative grid min-h-[calc(40vh+64px)] lg:min-h-[calc(56vh+64px)] place-items-center sm:m-0 m-2">
        {/* Background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/banner.png')",
          }}
        />
        
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/30"></div>
        
        {/* Content - Using grid for centering */}
        <div className="relative z-10 w-full">
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:mx-0">
              
              {/* Title */}
              <h1 className="mb-4 text-center text-xl font-bold text-white sm:text-3xl md:text-left md:text-4xl lg:text-4xl">
                TD SYNNEX SURFACE DEMOS
              </h1>
              
              {/* Paragraph */}
              <p className="mb-6 text-center sm:w-120 text-sm text-gray-100 sm:text-base md:text-left md:text-lg lg:mb-8 lg:text-base lg:leading-7 font-sans">
                Together with TD SYNNEX, the Microsoft team has created an exclusive Demo Program that gives customers the ability to customize, compare, and evaluate the most cutting-edge Surface devices in just a few simple steps!
              </p>
              
              {/* Logo */}
              <div className="mb-6 flex justify-center md:justify-start lg:mb-8">
                <Image
                  src="/collab.png"
                  alt="TD SYNNEX and Microsoft Collaboration"
                  width={300}
                  height={90}
                  className="h-auto sm:w-[300px] w-[250px]"
                  priority
                />
              </div>
              
              {/* Button */}
              <div className="flex justify-center md:justify-start">
                <Link
                  href="/product-category/alldevices"
                  className="inline-flex items-center justify-center rounded bg-[#f7b500] hover:bg-[#f1be31] px-5 py-2 text-sm font-semibold text-black focus:outline-none focus:ring-4 focus:ring-[#f7b500]/50 sm:px-6 sm:py-3 sm:text-base md:px-7 md:py-3 md:text-base"
                >
                  Create Demo Kit
                </Link>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}