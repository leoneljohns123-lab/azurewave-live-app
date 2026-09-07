
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { User } from '@/lib/types';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, addDocumentNonBlocking, useCollection } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { getEffectiveDisplayName } from '@/lib/user-helpers';

interface ReportUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: User;
}

export function ReportUserDialog({ open, onOpenChange, recipient }: ReportUserDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { profile: currentUserProfile } = useEffectiveUserProfile();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReport = () => {
    if (!currentUserProfile || !recipient) return;
    if (!reason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Reason Required',
        description: 'Please provide a reason for your report.',
      });
      return;
    }

    setIsSubmitting(true);
    const reportsCollection = collection(firestore, 'reports');
    
    addDocumentNonBlocking(reportsCollection, {
      reporterId: currentUserProfile.id,
      reportedId: recipient.id,
      reason: reason.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    }).then(() => {
        toast({
            title: 'Report Submitted',
            description: `Thank you for reporting ${getEffectiveDisplayName(recipient)}. Our team will review it shortly.`,
        });
        setIsSubmitting(false);
        setReason('');
        onOpenChange(false);
    }).catch((error) => {
        console.error("Error submitting report: ", error);
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: "Could not submit your report. Please try again.",
        });
        setIsSubmitting(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 text-white">
        <DialogHeader className="p-6 text-center">
          <DialogTitle className="text-2xl font-bold">Report {getEffectiveDisplayName(recipient)}</DialogTitle>
          <DialogDescription className="text-gray-300">
            Please provide a reason for reporting this user.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6">
          <Textarea
            placeholder="Describe the issue..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
            className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg"
            disabled={isSubmitting}
          />
        </div>
        <DialogFooter className="p-6 bg-black/20">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-white/10 hover:text-white" disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmitReport} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
