
'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlag, faCheck, faGavel } from '@fortawesome/free-solid-svg-icons';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Report, User, ModerationAction } from '@/lib/types';
import { UserAvatar } from './user-avatar';
import { Separator } from './ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { useChat } from '@/context/chat-context';
import { collection, query, where, doc, orderBy, updateDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { getEffectiveDisplayName } from '@/lib/user-helpers';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ModerationActionDialog } from './moderation-action-dialog';

function ReportItem({ report, usersMap, onModerate, onResolve }: {
  report: Report;
  usersMap: Map<string, User>;
  onModerate: (actionType: 'warn' | 'kick' | 'mute' | 'ban', user: User) => void;
  onResolve: (reportId: string) => void;
}) {
  const reporter = usersMap.get(report.reporterId);
  const reported = usersMap.get(report.reportedId);

  if (!reporter || !reported) {
    return (
      <div className="flex items-center gap-3 p-3">
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg hover:bg-accent">
      <div className="flex items-start gap-3">
        <UserAvatar user={reported} className="h-10 w-10" />
        <div className="flex-1">
          <p className="text-sm font-semibold">{getEffectiveDisplayName(reported)}</p>
          <p className="text-xs text-muted-foreground">
            Reported by {getEffectiveDisplayName(reporter)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <FontAwesomeIcon icon={faGavel} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => onModerate('warn', reported)}>Warn</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onModerate('kick', reported)}>Kick</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onModerate('mute', reported)}>Mute</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onModerate('ban', reported)} className="text-red-500 focus:text-red-400">Ban</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onResolve(report.id)}>
              <FontAwesomeIcon icon={faCheck} className="mr-2 h-4 w-4 text-green-500" />
              Resolve Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="text-sm text-muted-foreground bg-black/20 p-2 rounded-md ml-13">
        <span className="font-semibold text-foreground">Reason:</span> {report.reason}
      </div>
      <p className="text-xs text-muted-foreground/80 self-start ml-13 mt-1">
        {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
      </p>
    </div>
  );
}


export function ReportsPopover() {
  const { profile, realProfile } = useEffectiveUserProfile();
  const { hasPermission, users } = useChat();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [moderationDialogState, setModerationDialogState] = useState<{
    actionType: 'warn' | 'kick' | 'mute' | 'ban';
    user: User;
  } | null>(null);

  const canViewReports = hasPermission(profile, 'viewReports');

  const reportsQuery = useMemoFirebase(() => {
    if (!canViewReports) return null;
    return query(
      collection(firestore, 'reports'),
      where('status', '==', 'pending')
    );
  }, [firestore, canViewReports]);

  const { data: reportsData, isLoading: areReportsLoading } = useCollection<Report>(reportsQuery);
  
  const reports = useMemo(() => {
    if (!reportsData) return null;
    return [...reportsData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reportsData]);

  const pendingReportsCount = reports?.length || 0;

  const usersMap = useMemo(() => {
    if (!users) return new Map();
    return new Map(users.map(user => [user.id, user]));
  }, [users]);
  
  const handleModerate = (actionType: 'warn' | 'kick' | 'mute' | 'ban', user: User) => {
    setModerationDialogState({ actionType, user });
  };
  
  const handleResolve = (reportId: string) => {
    const reportRef = doc(firestore, 'reports', reportId);
    updateDocumentNonBlocking(reportRef, { status: 'resolved' });
    toast({ title: 'Report Resolved' });
  };

  const handleConfirmModeration = async ({ reason, duration }: { reason: string; duration?: number; }) => {
    if (!realProfile || !moderationDialogState) return;
    const { actionType, user } = moderationDialogState;

    const userToUpdateRef = doc(firestore, 'users', user.id);
    let actionText = actionType;

    if (actionType === 'warn') {
        const newWarning = {
            moderatorId: realProfile.id,
            reason: reason || 'No reason provided.',
            createdAt: new Date().toISOString(),
        };
        await updateDoc(userToUpdateRef, { warnings: arrayUnion(newWarning) });
        
        const updatedUserDoc = await getDoc(userToUpdateRef);
        if (updatedUserDoc.exists()) {
            const updatedUserData = updatedUserDoc.data() as User;
            const warningCount = updatedUserData.warnings?.length || 0;

            if (warningCount >= 3) {
                const muteDurationMinutes = 60;
                const muteExpiresAt = new Date(Date.now() + muteDurationMinutes * 60 * 1000).toISOString();
                await updateDoc(userToUpdateRef, { mutedUntil: muteExpiresAt });

                const autoMuteAction: Omit<ModerationAction, 'id'> = {
                    moderatorId: 'system',
                    userId: user.id,
                    actionType: 'mute',
                    reason: `Automatic mute after ${warningCount} warnings.`,
                    duration: muteDurationMinutes,
                    createdAt: new Date().toISOString(),
                };
                
                const moderationActionsCollection = collection(firestore, 'moderationActions');
                addDocumentNonBlocking(moderationActionsCollection, autoMuteAction).then(autoMuteActionRef => {
                    if (!autoMuteActionRef) return;
                    const notificationsCollection = collection(firestore, 'users', user.id, 'notifications');
                    addDocumentNonBlocking(notificationsCollection, {
                        userId: user.id,
                        senderId: 'system',
                        text: `You have been automatically muted for ${muteDurationMinutes} minutes for receiving ${warningCount} warnings.`,
                        timestamp: new Date().toISOString(),
                        read: false,
                        type: 'moderation',
                        action: { ...autoMuteAction, id: autoMuteActionRef.id }
                    });
                });
                
                toast({
                    variant: 'destructive',
                    title: 'User Auto-Muted',
                    description: `${getEffectiveDisplayName(user)} has been muted for ${muteDurationMinutes} minutes after receiving ${warningCount} warnings.`
                });
            }
        }
    } else {
        let updateData: any = {};
        let expiresAt: string | undefined;
        if (duration) {
          expiresAt = new Date(Date.now() + duration * 60 * 1000).toISOString();
        }

        switch(actionType) {
            case 'kick':
                const kickDuration = duration || 1; // 1 minute cooldown
                updateData = { kickedUntil: new Date(Date.now() + kickDuration * 60 * 1000).toISOString() };
                break;
            case 'mute':
            case 'ban':
                updateData = { mutedUntil: (actionType === 'ban' || !duration) ? '9999-12-31T23:59:59Z' : expiresAt };
                break;
        }

        if (Object.keys(updateData).length > 0) {
            updateDocumentNonBlocking(userToUpdateRef, updateData);
        }
    }

    const moderationActionData: Omit<ModerationAction, 'id'> = {
        moderatorId: realProfile.id,
        userId: user.id,
        actionType: actionType,
        reason: reason || 'No reason provided.',
        createdAt: new Date().toISOString(),
        ...(duration && { duration }),
    };

    const moderationActionsCollection = collection(firestore, 'moderationActions');
    addDocumentNonBlocking(moderationActionsCollection, moderationActionData)
        .then(moderationActionRef => {
            if (!moderationActionRef) return;

            const notificationText = `You have been ${actionType}ed by ${getEffectiveDisplayName(realProfile)}. Reason: ${reason}`;
            const notificationsCollection = collection(firestore, 'users', user.id, 'notifications');
            addDocumentNonBlocking(notificationsCollection, {
                userId: user.id,
                senderId: 'system',
                text: notificationText,
                timestamp: new Date().toISOString(),
                read: false,
                type: 'moderation',
                action: { ...moderationActionData, id: moderationActionRef.id }
            });
        });

    toast({ title: "Action Successful", description: `${getEffectiveDisplayName(user)} has been ${actionType}ed.` });
  };
  
  if (!canViewReports) {
    return null;
  }

  return (
    <>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Reports" className="relative">
          <FontAwesomeIcon icon={faFlag} className="w-5 h-5" />
          {pendingReportsCount > 0 && (
            <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center border-2 border-card">
              {pendingReportsCount > 9 ? '9+' : pendingReportsCount}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
            <h4 className="font-semibold text-sm">Pending Reports</h4>
        </div>
        <ScrollArea className="max-h-96">
            <div className="p-2">
            {areReportsLoading ? (
                <div className="p-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex flex-col gap-2 p-3">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                ))}
                </div>
            ) : reports && reports.length > 0 ? (
                reports.map((report, index) => (
                <div key={report.id}>
                    <ReportItem report={report} usersMap={usersMap} onModerate={handleModerate} onResolve={handleResolve} />
                    {index < reports.length - 1 && <Separator className="my-0" />}
                </div>
                ))
            ) : (
                <div className="text-center py-12">
                    <p className="text-sm text-muted-foreground">No pending reports.</p>
                </div>
            )}
            </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
    {moderationDialogState && (
        <ModerationActionDialog
            isOpen={!!moderationDialogState}
            onOpenChange={(isOpen) => !isOpen && setModerationDialogState(null)}
            actionType={moderationDialogState.actionType}
            user={moderationDialogState.user}
            onConfirm={handleConfirmModeration}
        />
    )}
    </>
  );
}
