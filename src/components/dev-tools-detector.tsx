'use client';

import { useState, useEffect } from 'react';

const DEV_TOOLS_THRESHOLD = 160;
const RESTRICTION_SECONDS = 5;

export function DevToolsDetector() {
  const [isRestricted, setIsRestricted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(RESTRICTION_SECONDS);

  useEffect(() => {
    let devToolsOpen = false;
    let isInitialCheck = true;

    const handleDevToolsChange = () => {
      // Avoid false positives during rapid layout shifts, hidden windows, or navigation jumps
      if (window.innerWidth === 0 || window.innerHeight === 0) return;

      const isOpening = window.outerWidth - window.innerWidth > DEV_TOOLS_THRESHOLD ||
                        window.outerHeight - window.innerHeight > DEV_TOOLS_THRESHOLD;

      // Trigger restriction only when tools transition from closed to open
      // and not if they were already open when the component mounted
      if (isOpening && !devToolsOpen && !isInitialCheck) {
        setIsRestricted(true);
      }
      
      devToolsOpen = isOpening;
      isInitialCheck = false;
    };

    // Run immediately to establish initial state without triggering the restriction
    handleDevToolsChange();

    const interval = setInterval(handleDevToolsChange, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isRestricted) {
        // When restriction starts, reset the timer
        setTimeLeft(RESTRICTION_SECONDS);

        const countdownInterval = setInterval(() => {
            setTimeLeft(prevTime => {
                const newTime = prevTime - 1;
                if (newTime <= 0) {
                    clearInterval(countdownInterval);
                    setIsRestricted(false); // Hide dialog when timer ends
                    return 0;
                }
                return newTime;
            });
        }, 1000);

        return () => {
            clearInterval(countdownInterval);
        };
    }
  }, [isRestricted]);


  if (!isRestricted) {
    return null;
  }
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#363636] text-white p-4">
        {/* Central Content */}
        <div className="flex flex-col items-center z-10">
            <div className="bg-[#424242] border border-gray-500 rounded-lg p-4 sm:p-8 max-w-lg w-full text-center shadow-2xl mx-2">
                <h1 className="text-xl sm:text-2xl font-bold text-orange-400 uppercase mb-4 tracking-wider">Access Restricted</h1>
                <p className="text-gray-300 mb-8 text-sm sm:text-base">
                    Your access has been temporarily restricted due to a security violation. This event has been logged.
                </p>
                <div className="inline-block border border-orange-400 rounded px-4 py-2 sm:px-6 sm:py-3 my-4">
                    <div className="text-4xl sm:text-6xl font-mono text-orange-400 tabular-nums">
                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </div>
                </div>
                <p className="text-sm text-gray-300 mb-8">
                    Time remaining
                </p>
                <p className="text-xs text-orange-400">
                    Repeated attempts to bypass security will extend the restriction period.
                </p>
            </div>
        </div>
    </div>
  );
}
