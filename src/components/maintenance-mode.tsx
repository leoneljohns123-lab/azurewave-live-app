'use client';

import Image from 'next/image';

export function MaintenanceMode() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 text-white p-4 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black opacity-50"></div>
        <div className="relative animate-in fade-in zoom-in-95 duration-500">
            <div className="mb-8">
                <div className="relative inline-block">
                    <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="relative w-32 h-32 bg-slate-900 rounded-full flex items-center justify-center border-2 border-slate-800">
                        <Image 
                            src="/interface_icons/maintenance.svg" 
                            alt="Maintenance" 
                            width={72} 
                            height={72}
                            className="drop-shadow-lg"
                        />
                    </div>
                </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Under Maintenance</h1>
            <p className="text-lg text-slate-400 max-w-lg mx-auto">
                We are currently performing scheduled maintenance. We should be back online shortly. Thank you for your patience.
            </p>
        </div>
    </div>
  );
}
