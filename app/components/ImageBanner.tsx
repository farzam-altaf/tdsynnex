import Image from "next/image";

export default function ImageBanner() {
    
  return (
    <div className="relative w-full">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-0 my-6">
        
        {/* Large screens */}
        <div className="hidden lg:block">
          <div className="flex justify-center">
            <Image
              src="/description1.png"
              alt="Description for large screens"
              width={1000}
              height={350}
              className="h-auto w-full max-w-6xl rounded-lg"
              priority
            />
          </div>
        </div>
        
        {/* Medium and small screens */}
        <div className="lg:hidden">
          <Image
            src="/description2.png"
            alt="Description for mobile and tablet"
            width={800}
            height={300}
            className="h-auto w-full rounded-lg"
            priority
          />
        </div>
        
      </div>
    </div>
  );
}