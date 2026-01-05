'use client'

import { ImAidKit } from "react-icons/im"
import StepCard from "./step-card"
import { TfiWrite } from "react-icons/tfi"
import { FaCircleCheck, FaPlaneDeparture, FaTrophy } from "react-icons/fa6"
import { IoReturnUpBack } from "react-icons/io5"

const STEPS = [
  { title: 'REGISTRATION', description: 'Complete the registration process to start using the portal', icon: <TfiWrite className="h-8 w-8 text-[#3D9DD6]" />, number: 1 },
  { title: 'CREATE DEMO KIT', description: 'Choose between different products for a 30-day demo', icon: <ImAidKit className="h-8 w-8 text-[#3D9DD6]" />, number: 2 },
  { title: 'CHECKOUT', description: 'Fill out the form with shipping & opportunity details and checkout easily', icon: <FaCircleCheck className="h-8 w-8 text-[#3D9DD6]" />, number: 3 },
  { title: 'ORDER SHIPMENT', description: 'Seamless overnight shipment after order approval', icon: <FaPlaneDeparture className="h-8 w-8 text-[#3D9DD6]" />, number: 4 }, // Changed from 3 to 4
  { title: 'RETURN ORDER', description: 'Simple order return using hard/soft copy of provided prepaid return label', icon: <IoReturnUpBack className="h-8 w-8 text-[#3D9DD6]" />, number: 5 },
  { title: 'REPORT A WIN', description: 'Close customer after demo period and enter win details', icon: <FaTrophy className="h-8 w-8 text-[#3D9DD6]" />, number: 6 },
]

export default function HowItWorks() {
  return (
    <section className="relative bg-white overflow-hidden lg:py-10">
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-xl md:text-4xl lg:text-4xl font-semibold text-center text-gray-900 mb-20">
          How it Works
        </h2>

        {/* Centered container with proper max-width */}
        <div className="flex justify-center">
          <div className="w-full max-w-6xl">
            {/* Responsive Grid */}
            <div
              className="
                grid 
                grid-cols-1 
                md:grid-cols-2 
                lg:grid-cols-3
                gap-10 
                sm:gap-10
                md:gap-10
                lg:gap-10
                xl:gap-12
                justify-items-center
                px-5 md:px-0
              "
            >
              {STEPS.map((step) => (
                <StepCard key={step.number} {...step} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}