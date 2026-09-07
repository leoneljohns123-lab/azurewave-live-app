'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGavel } from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';

interface ChatPrisonViewProps {
  message?: string | null;
  initialTimeLeft?: number;
  reason?: string;
  roomName?: string;
  squareName?: string;
  isBanned?: boolean;
}

function KickedView({ initialTimeLeft, reason, roomName, squareName }: { initialTimeLeft: number; reason?: string; roomName?: string; squareName?: string }) {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const [ticketId, setTicketId] = useState('');

  useEffect(() => {
    setTimeLeft(initialTimeLeft);
  }, [initialTimeLeft]);

  useEffect(() => {
    // Generate ticket ID only on the client
    setTicketId(`#${Math.floor(1000 + Math.random() * 9000)}`);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prevTime => (prevTime > 0 ? prevTime - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const minutes = String(Math.floor(Math.max(0, timeLeft) / 60)).padStart(2, '0');
  const seconds = String(Math.max(0, timeLeft) % 60).padStart(2, '0');

  return (
    <div className="kicked-overlay">
      <div className="kicked-card">
        <h1 style={{ fontSize: '16px', marginBottom: '8px' }}>KICKED</h1>
        <h1>ACCESS RESTRICTED</h1>

        <p>
          Your access has been temporarily restricted due to a security violation.
          This event has been logged.
        </p>

        <div className="kicked-details">
          <div><span>Reason:</span> {reason || 'Spamming / Breaking rules'}</div>
          {(roomName || squareName) && <div><span>Room:</span> {roomName || squareName}</div>}
          <div><span>Contact:</span> admin@example.com</div>
          <div><span>Ticket ID:</span> {ticketId}</div>
        </div>

        <div className="kicked-timer-box">{minutes}:{seconds}</div>
        <div className="kicked-label">Time remaining</div>

        <div className="kicked-warning">
          Any attempts to bypass security will extend the restriction period.
        </div>
      </div>
    </div>
  );
}

function BannedView({ reason, roomName, squareName }: { reason?: string; roomName?: string; squareName?: string }) {
  const [ticketId, setTicketId] = useState('');

  useEffect(() => {
    setTicketId(`#${Math.floor(1000 + Math.random() * 9000)}`);
  }, []);

  const handleAppeal = () => {
    window.location.href = `mailto:admin@example.com?subject=Ban Appeal Ticket ${ticketId}`;
  };

  return (
    <div className="banned-overlay">
      <div className="banned-card">
        <div className="banned-top">
          <h1>YOU HAVE BEEN BANNED</h1>
          <h2>ACCESS DENIED</h2>
        </div>
        <p>
          Your account has been banned due to repeated violations.
          This action is permanent unless reviewed by an admin.
        </p>
        <div className="banned-details">
          <div><span>Reason:</span> {reason || 'Breaking rules'}</div>
          {(roomName || squareName) && <div><span>Room:</span> {roomName || squareName}</div>}
          <div><span>Contact:</span> admin@example.com</div>
          <div><span>Ticket ID:</span> {ticketId}</div>
        </div>
        <div className="banned-timer-row">
          <div className="banned-timer-box">PERMANENT</div>
          <div className="banned-label">Ban Duration</div>
        </div>
        <button className="banned-btn" onClick={handleAppeal}>APPEAL BAN</button>
        <div className="banned-warning">
          If you believe this is a mistake, contact support immediately.
        </div>
      </div>
    </div>
  );
}


function GenericRestrictionView({ message }: { message: string | null }) {
    return (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-4 text-center">
             <div className="absolute inset-0 pointer-events-none flex justify-around opacity-20">
                {[...Array(15)].map((_, i) => (
                    <div key={i} className="w-2 bg-gradient-to-b from-red-500 via-red-800 to-red-500"></div>
                ))}
            </div>
            <div className="relative">
                <Image src="/interface_icons/regmute.svg" alt="Muted Icon" width={96} height={96} className="mb-6 drop-shadow-[0_0_10px_rgba(239,68,68,0.7)]" />
                <h2 className="text-4xl font-extrabold text-white mb-3 tracking-wider uppercase">
                    Chat Prison
                </h2>
                <p className="text-xl text-red-300 font-medium">
                    {message || "You are currently restricted from chatting."}
                </p>
            </div>
        </div>
    );
}

export function ChatPrisonView({ message, initialTimeLeft, reason, roomName, squareName, isBanned }: ChatPrisonViewProps) {
    if (isBanned) {
        return <BannedView reason={reason} roomName={roomName || squareName} />;
    }
    if (typeof initialTimeLeft === 'number') {
        return <KickedView initialTimeLeft={initialTimeLeft} reason={reason} roomName={roomName || squareName} />;
    }
    return <GenericRestrictionView message={message || null} />;
}
