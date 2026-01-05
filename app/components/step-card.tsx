/* eslint-disable @next/next/no-img-element */
'use client'

import { ReactNode } from "react"

interface StepCardProps {
  icon: ReactNode   
  title: string
  description: string
  number: number
}

export default function StepCard({ icon, title, description, number }: StepCardProps) {
  return (
    <div className="group relative w-full max-w-[420px]  overflow-visible pb-10 container">
      {/* ORANGE frame (under card, no negative z) */}
      <div className="pointer-events-none absolute -top-3.5 -left-3.5 h-50 w-85  lg:w-65 xl:w-75 2xl:w-85 rounded-2xl border border-gray-400 z-0" />

      {/* BLUE top-left corner (under card) */}
      <div className="pointer-events-none absolute -top-4 -left-4 h-14 w-14 border-t-[5px] border-l-[5px] border-[#3D9DD6] rounded-tl-2xl transition-all duration-500 ease-in-out group-hover:h-20 group-hover:w-20 z-0" />

      {/* MAIN CARD (above decorations) */}
      <div className="relative z-10 w-full rounded-3xl border border-gray-200 bg-gray-50 px-6 py-6 pt-20 shadow-xl min-h-[220px]">
        {/* Icon */}
        <div className="absolute left-1/2 top-5 -translate-x-1/2">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white to-[#d9d9d9] shadow-[4px_4px_10px_rgba(0,0,0,0.15),-4px_-4px_10px_rgba(255,255,255,0.8)] transition-all duration-500 ease-in-out group-hover:from-[#e9e9e9] group-hover:to-[#d9d9d9]" />
            <div className="absolute inset-[6px] flex items-center justify-center rounded-full border border-[#f4f4f4] bg-[#f4f4f4]">
              {/* <img src={icon} alt={title} className="h-8 w-8 object-contain" /> */}
              {icon}
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="mt-8 flex flex-col space-y-4 text-center">
          <h3 className="text-xl font-bold tracking-wide text-gray-600">{title}</h3>
          <p className="text-base leading-relaxed text-gray-600">{description}</p>
        </div>

        {/* NUMBER badge (top layer) */}
        <div className="absolute -right-3 -bottom-3 z-30">
          <div className="flex h-14 w-14 items-center justify-center rounded-tl-3xl bg-[#3D9DD6] text-2xl font-bold text-white shadow-md">
            {number}
          </div>
        </div>
      </div>

      {/* BLUE chip behind number (between frame and badge) */}
      <div className="pointer-events-none absolute -right-1 bottom-9  h-20 w-20 rounded-bl-2xl rounded-tr-2xl bg-[#3D9DD6] translate-x-2 translate-y-2 z-0" />
    </div>
  )
}