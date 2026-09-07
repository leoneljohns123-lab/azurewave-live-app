
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { User, WarningRecord } from '@/lib/types';
import { UserAvatar } from './user-avatar';
import { getEffectiveDisplayName, getEffectiveUserRole } from '@/lib/user-helpers';
import { format, formatDistanceToNow } from 'date-fns';
import { Separator } from './ui/separator';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faGem, faCheckCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { ScrollArea } from './ui/scroll-area';
import { useChat } from '@/context/chat-context';
import { useMemo } from 'react';
import { Badge } from './ui/badge';

interface WhoisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  roomId?: string;
}

const InfoRow = ({ label, value }: { label: React.ReactNode, value: React.ReactNode }) => (
    <>
        <div className="text-sm text-gray-400">{label}</div>
        <div className="text-sm text-right truncate">{value}</div>
    </>
);

export function WhoisDialog({ open, onOpenChange, user, roomId }: WhoisDialogProps) {
  if (!user) return null;
  
  const { users } = useChat();

  const otherAccounts = useMemo(() => {
    if (!users || (!user.lastLoginIpHash && !user.registrationIpHash)) return [];
    return users.filter(u => u.id !== user.id && ((user.lastLoginIpHash && u.lastLoginIpHash === user.lastLoginIpHash) || (user.registrationIpHash && u.registrationIpHash === user.registrationIpHash)));
  }, [users, user]);
  
  const effectiveDisplayName = getEffectiveDisplayName(user);
  const effectiveRole = getEffectiveUserRole(user, roomId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 text-white bg-[#2f194d] border-none rounded-2xl">
        <DialogHeader className="p-6 text-center">
          <DialogTitle className="text-2xl font-bold">Whois: {effectiveDisplayName}</DialogTitle>
          <DialogDescription className="text-gray-300">
            Detailed information for this user.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="px-6 pb-6 space-y-4">
              <div className="flex items-center gap-4">
                  <UserAvatar user={user} className="w-16 h-16" />
                  <div>
                      <h3 className="text-lg font-bold">{effectiveDisplayName}</h3>
                      <p className="text-sm text-gray-400">@{user.username}</p>
                      <p className="text-xs text-gray-500 font-mono">{user.id}</p>
                  </div>
              </div>
              <Separator className="bg-white/10" />
              <div>
                  <h4 className="font-semibold mb-2">General</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <InfoRow label="Role" value={effectiveRole} />
                    <InfoRow label="Level" value={user.level || 1} />
                    <InfoRow label="Email" value={user.email || 'N/A'} />
                    <InfoRow label="Location" value={user.lastLoginLocation || 'N/A'} />
                    <InfoRow label="Joined" value={user.createdAt ? format(new Date(user.createdAt), 'PPp') : 'N/A'} />
                    <InfoRow label="Last Seen" value={user.lastSeen ? formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true }) : 'Never'} />
                    <InfoRow label="Messages" value={(user.messageCount || 0).toLocaleString()} />
                  </div>
              </div>
              <Separator className="bg-white/10" />
               <div>
                  <h4 className="font-semibold mb-2">Financials</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <InfoRow label={<><FontAwesomeIcon icon={faCoins} className="text-yellow-400 mr-2" /> Gold</>} value={(user.gold || 0).toLocaleString()} />
                    <InfoRow label={<><FontAwesomeIcon icon={faGem} className="text-red-400 mr-2" /> Rubies</>} value={(user.rubies || 0).toLocaleString()} />
                  </div>
               </div>
              <Separator className="bg-white/10" />
               <div>
                  <h4 className="font-semibold mb-2">Connection Info</h4>
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                      <p className="text-gray-400">Registration IP Hash:</p><p className="font-mono text-right truncate">{user.registrationIpHash || 'N/A'}</p>
                      <p className="text-gray-400">Last Login IP Hash:</p><p className="font-mono text-right truncate">{user.lastLoginIpHash || 'N/A'}</p>
                  </div>
               </div>
              <Separator className="bg-white/10" />
              <div>
                <h4 className="font-semibold mb-2">Linked Accounts ({otherAccounts.length})</h4>
                <p className="text-xs text-gray-500 mb-2">
                    Note: This is based on a secure hash of the user's IP, not the raw IP itself.
                </p>
                {otherAccounts.length > 0 ? (
                    <div className="space-y-2">
                        {otherAccounts.map(acc => (
                            <div key={acc.id} className="flex items-center gap-2 bg-black/20 p-2 rounded-md">
                                <UserAvatar user={acc} className="w-8 h-8" />
                                <span>{getEffectiveDisplayName(acc)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">No other accounts found.</p>
                )}
              </div>
               <Separator className="bg-white/10" />
              <div>
                <h4 className="font-semibold mb-2">Name History ({user.previousUsernames?.length || 0})</h4>
                {user.previousUsernames && user.previousUsernames.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {user.previousUsernames.map((name: string, index: number) => (
                            <Badge key={index} variant="secondary">{name}</Badge>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">No previous usernames on record.</p>
                )}
              </div>
              <Separator className="bg-white/10" />
               <div>
                  <h4 className="font-semibold mb-2">Account Status</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <InfoRow label={<><FontAwesomeIcon icon={faCheckCircle} className={user.isVerified ? 'text-green-400' : 'text-gray-600'} /> Verified</>} value={user.isVerified ? 'Yes' : 'No'} />
                  </div>
               </div>
              <Separator className="bg-white/10" />
              <div>
                  <h4 className="font-semibold mb-2">Moderation History ({user.warnings?.length || 0})</h4>
                  {user.warnings && user.warnings.length > 0 ? (
                      <div className="space-y-2 text-sm">
                          {user.warnings.map((warning, index) => (
                              <div key={index} className="bg-black/20 p-2 rounded-md">
                                  <p className="text-red-400"><FontAwesomeIcon icon={faExclamationTriangle} className="mr-2"/>{warning.reason}</p>
                                  <p className="text-xs text-gray-400 mt-1">Issued by {warning.moderatorId} on {format(new Date(warning.createdAt), 'PP')}</p>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p className="text-sm text-gray-400">No warnings on record.</p>
                  )}
              </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
