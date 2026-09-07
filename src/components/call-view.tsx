
'use client';

import { User, Square } from '@/lib/types';
import { UserAvatar } from './user-avatar';
import { Button } from './ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faMicrophone,
    faMicrophoneSlash,
    faVideo,
    faVideoSlash,
    faPhoneSlash,
    faShare,
    faSmile,
    faThLarge,
    faThumbtack
} from '@fortawesome/free-solid-svg-icons';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  doc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import styles from './call-layouts.module.css';


const configuration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const ParticipantTile = ({ user, stream, isLocal, isMuted, isCallAdmin, onPin, isPinned }: { user: User, stream?: MediaStream | null, isLocal?: boolean, isMuted?: boolean, isCallAdmin?: boolean, onPin?: (userId: string) => void, isPinned?: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="relative w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden group">
            {stream ? (
                <video ref={videoRef} autoPlay muted={isLocal} playsInline className="w-full h-full object-cover" />
            ) : (
                <UserAvatar user={user} className="w-24 h-24 text-5xl opacity-50" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
                 <p className="font-semibold text-white text-sm">{user.displayName}</p>
                 {isMuted && <FontAwesomeIcon icon={faMicrophoneSlash} className="text-white h-3 w-3" />}
            </div>
            {isCallAdmin && onPin && !isLocal && (
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "absolute top-2 right-2 h-8 w-8 bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity",
                        isPinned && "opacity-100 bg-blue-500 hover:bg-blue-600"
                    )}
                    onClick={() => onPin(user.id)}
                >
                    <FontAwesomeIcon icon={faThumbtack} />
                </Button>
            )}
        </div>
    );
};

interface CallViewProps {
    square: Square;
    allUsers: User[];
    onLeave: () => void;
}

const LayoutPreviewButton = ({ layoutNum, children, active, onClick }: { layoutNum: number, children: React.ReactNode, active: boolean, onClick: (num: number) => void}) => (
    <div
      className={cn(styles.layoutBtn, styles[`grid-${layoutNum}`], active && styles.active)}
      onClick={() => onClick(layoutNum)}
    >
      {children}
    </div>
  );

export function CallView({ square, allUsers, onLeave }: CallViewProps) {
    const [isMuted, setIsMuted] = useState(false);
    const [isCamOff, setIsCamOff] = useState(false);
    const [timer, setTimer] = useState("00:00");
    const { profile: currentUserProfile } = useEffectiveUserProfile();
    const { toast } = useToast();
    const firestore = useFirestore();

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    
    const peerConnectionsRef = useRef<{ [key: string]: RTCPeerConnection }>({});
    const [remoteStreams, setRemoteStreams] = useState<{ [key: string]: MediaStream | null }>({});
    const [isLayoutDialogOpen, setIsLayoutDialogOpen] = useState(false);

    const isCallAdmin = (square.call?.participants && square.call.participants.length > 0 && currentUserProfile?.id === square.call.participants[0]) || currentUserProfile?.role === 'Owner';

    useEffect(() => {
        const getCameraPermission = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            setHasCameraPermission(true);
          } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            toast({
              variant: 'destructive',
              title: 'Camera Access Denied',
              description: 'Please enable camera permissions in your browser settings to use this app.',
            });
          }
        };

        if (!isCamOff) {
            getCameraPermission();
        } else {
            localStream?.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }

        return () => {
            localStream?.getTracks().forEach(track => track.stop());
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCamOff, toast]);

    useEffect(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !isMuted;
            });
        }
    }, [isMuted, localStream]);


    useEffect(() => {
        let seconds = 0;
        const interval = setInterval(() => {
            seconds++;
            const m = String(Math.floor(seconds / 60)).padStart(2, '0');
            const s = String(seconds % 60).padStart(2, '0');
            setTimer(`${m}:${s}`);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const participants = useMemo(() => {
        return square.call?.participants
            .map(participantId => allUsers.find(u => u.id === participantId))
            .filter((u): u is User => !!u) ?? [];
    }, [square.call?.participants, allUsers]);

    // Main WebRTC Logic
    useEffect(() => {
        if (!localStream || !currentUserProfile || participants.length <= 1) return;

        const signalCollection = collection(firestore, 'squares', square.id, 'callSignals');
        const otherParticipants = participants.filter(p => p.id !== currentUserProfile.id);

        // Listen for signals intended for me
        const q = query(signalCollection, where('to', '==', currentUserProfile.id));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const signal = change.doc.data();
                    const fromId = signal.from;
                    const pc = peerConnectionsRef.current[fromId];

                    if (!pc) return;

                    if (signal.type === 'offer') {
                        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);

                        await addDoc(signalCollection, {
                            from: currentUserProfile.id,
                            to: fromId,
                            type: 'answer',
                            payload: pc.localDescription.toJSON()
                        });
                    } else if (signal.type === 'answer') {
                        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
                    } else if (signal.type === 'ice-candidate') {
                       try {
                         await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
                       } catch (e) {
                         console.error('Error adding received ice candidate', e);
                       }
                    }
                    await deleteDoc(change.doc.ref);
                }
            });
        });

        // Handle leaving participants
        const currentPeerIds = new Set(Object.keys(peerConnectionsRef.current));
        const newParticipantIds = new Set(otherParticipants.map(p => p.id));
        currentPeerIds.forEach(peerId => {
            if (!newParticipantIds.has(peerId)) {
                peerConnectionsRef.current[peerId]?.close();
                delete peerConnectionsRef.current[peerId];
                setRemoteStreams(prev => {
                    const newStreams = { ...prev };
                    delete newStreams[peerId];
                    return newStreams;
                });
            }
        });

        // Create peer connections for other participants
        otherParticipants.forEach(participant => {
            const peerId = participant.id;
            if (peerConnectionsRef.current[peerId]) return;

            const pc = new RTCPeerConnection(configuration);
            peerConnectionsRef.current[peerId] = pc;

            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });

            pc.ontrack = event => {
                setRemoteStreams(prev => ({
                    ...prev,
                    [peerId]: event.streams[0]
                }));
            };

            pc.onicecandidate = event => {
                if (event.candidate) {
                    addDoc(signalCollection, {
                        from: currentUserProfile.id,
                        to: peerId,
                        type: 'ice-candidate',
                        payload: event.candidate.toJSON()
                    });
                }
            };
            
            pc.onconnectionstatechange = () => {
                console.log(`Connection state with ${participant.id}: ${pc.connectionState}`);
                if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                    console.warn(`Connection with ${participant.id} is ${pc.connectionState}. Attempting to restart ICE.`);
                    
                    if (pc.signalingState !== 'stable') {
                        console.log('Signaling state is not stable, aborting ICE restart.');
                        return;
                    }
                    pc.createOffer({ iceRestart: true })
                        .then(offer => pc.setLocalDescription(offer))
                        .then(() => {
                            if (pc.localDescription) {
                                addDoc(signalCollection, {
                                    from: currentUserProfile.id,
                                    to: peerId,
                                    type: 'offer',
                                    payload: pc.localDescription.toJSON(),
                                });
                            }
                        })
                        .catch(e => console.error("ICE restart failed:", e));
                }
            };

            if (currentUserProfile.id < peerId) {
                pc.createOffer().then(offer => {
                    return pc.setLocalDescription(offer);
                }).then(() => {
                    if (pc.localDescription) {
                        addDoc(signalCollection, {
                            from: currentUserProfile.id,
                            to: peerId,
                            type: 'offer',
                            payload: pc.localDescription.toJSON()
                        });
                    }
                }).catch(e => console.error("Error creating offer:", e));
            }
        });
        
        return () => {
            unsubscribe();
            Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
            peerConnectionsRef.current = {};
            
            const cleanupSignals = async () => {
                if (!currentUserProfile) return;
                const mySignalsQuery = query(signalCollection, where('from', '==', currentUserProfile.id));
                const snapshot = await getDocs(mySignalsQuery);
                snapshot.forEach(doc => deleteDoc(doc.ref));
            }
            cleanupSignals();
        };

    }, [localStream, currentUserProfile, participants, firestore, square.id]);

    const sortedParticipants = useMemo(() => {
        if (!currentUserProfile) return participants;
        const pinnedUserId = square.call?.pinnedUserId;
        
        let sorted = [...participants];

        sorted.sort((a, b) => {
            if (a.id === pinnedUserId) return -1;
            if (b.id === pinnedUserId) return 1;
            if (a.id === currentUserProfile.id) return -1;
            if (b.id === currentUserProfile.id) return 1;
            return a.displayName.localeCompare(b.displayName);
        });
        
        return sorted;
    }, [participants, currentUserProfile, square.call?.pinnedUserId]);
    
    const handleSelectLayout = (newLayout: number) => {
        if (!isCallAdmin) return;
        const squareRef = doc(firestore, 'squares', square.id);
        updateDocumentNonBlocking(squareRef, { 'call.layout': newLayout });
        setIsLayoutDialogOpen(false);
    };

    const handlePinUser = (userId: string) => {
        if (!isCallAdmin) return;
        const squareRef = doc(firestore, 'squares', square.id);
        const newPinnedId = square.call?.pinnedUserId === userId ? null : userId;
        updateDocumentNonBlocking(squareRef, { 'call.pinnedUserId': newPinnedId });
    };

    const handleInternalLeave = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        onLeave();
    };

    const activeLayout = square.call?.layout || 4;

    const renderGridContent = () => {
        if (activeLayout === 10) {
            const [mainParticipant, ...otherParticipants] = sortedParticipants;
            return (
                <div className={styles.filmstripContainer}>
                    <div className={styles.filmstripMain}>
                        {mainParticipant && (
                             <ParticipantTile 
                                user={mainParticipant}
                                stream={mainParticipant.id === currentUserProfile?.id ? localStream : remoteStreams[mainParticipant.id]}
                                isLocal={mainParticipant.id === currentUserProfile?.id}
                                isMuted={mainParticipant.id === currentUserProfile?.id && isMuted}
                                isCallAdmin={isCallAdmin}
                                onPin={handlePinUser}
                                isPinned={mainParticipant.id === square.call?.pinnedUserId}
                            />
                        )}
                    </div>
                    {otherParticipants.length > 0 && (
                        <div className={styles.filmstripReel}>
                            {otherParticipants.map((participant) => (
                                <div key={participant.id} className={cn(styles.tile, styles.filmstripTile)}>
                                    <ParticipantTile 
                                        user={participant}
                                        stream={remoteStreams[participant.id]}
                                        isLocal={false}
                                        isMuted={false} // Placeholder, would need audio levels for this
                                        isCallAdmin={isCallAdmin}
                                        onPin={handlePinUser}
                                        isPinned={participant.id === square.call?.pinnedUserId}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )
        }
        
        if (activeLayout === 12) {
            const [mainParticipant, ...otherParticipants] = sortedParticipants;
            const quadrant1 = otherParticipants.slice(0, 4);
            const quadrant2 = otherParticipants.slice(4, 8);
            const quadrant3 = otherParticipants.slice(8, 12);
      
            return (
              <div className={styles['layout-12-container']}>
                <div className={styles.tile}>
                  {mainParticipant && (
                    <ParticipantTile
                      user={mainParticipant}
                      stream={mainParticipant.id === currentUserProfile?.id ? localStream : remoteStreams[mainParticipant.id]}
                      isLocal={mainParticipant.id === currentUserProfile?.id}
                      isMuted={mainParticipant.id === currentUserProfile?.id && isMuted}
                      isCallAdmin={isCallAdmin}
                      onPin={handlePinUser}
                      isPinned={mainParticipant.id === square.call?.pinnedUserId}
                    />
                  )}
                </div>
                <div className={styles['layout-12-quadrant']}>
                  {quadrant1.map(p => (
                    <div key={p.id} className={styles.tile}>
                      <ParticipantTile user={p} stream={remoteStreams[p.id]} isMuted={false} isCallAdmin={isCallAdmin} onPin={handlePinUser} isPinned={p.id === square.call?.pinnedUserId}/>
                    </div>
                  ))}
                </div>
                <div className={styles['layout-12-quadrant']}>
                  {quadrant2.map(p => (
                    <div key={p.id} className={styles.tile}>
                      <ParticipantTile user={p} stream={remoteStreams[p.id]} isMuted={false} isCallAdmin={isCallAdmin} onPin={handlePinUser} isPinned={p.id === square.call?.pinnedUserId}/>
                    </div>
                  ))}
                </div>
                <div className={styles['layout-12-quadrant']}>
                  {quadrant3.map(p => (
                    <div key={p.id} className={styles.tile}>
                      <ParticipantTile user={p} stream={remoteStreams[p.id]} isMuted={false} isCallAdmin={isCallAdmin} onPin={handlePinUser} isPinned={p.id === square.call?.pinnedUserId}/>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
    
        return (
            <div className={cn(styles.callGrid, styles[`layout-${activeLayout}`])}>
                {sortedParticipants.map((participant) => (
                    <div key={participant.id} className={styles.tile}>
                        <ParticipantTile 
                            user={participant}
                            stream={participant.id === currentUserProfile?.id ? localStream : remoteStreams[participant.id]}
                            isLocal={participant.id === currentUserProfile?.id}
                            isMuted={participant.id === currentUserProfile?.id && isMuted}
                            isCallAdmin={isCallAdmin}
                            onPin={handlePinUser}
                            isPinned={participant.id === square.call?.pinnedUserId}
                        />
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="call-container">
            <header className="call-header">
                 <div className="call-participants">
                     {sortedParticipants.slice(0, 8).map(participant => (
                        <UserAvatar key={participant.id} user={participant} className="h-10 w-10 border-2 border-slate-700" />
                    ))}
                    {sortedParticipants.length > 8 && (
                        <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">
                            +{sortedParticipants.length - 8}
                        </div>
                    )}
                </div>
                <div className="call-status">
                    <span className="live-indicator">●</span> Live
                    <span className="call-timer">{timer}</span>
                </div>
                <div className="call-participants-spacer" />
                 <Button
                    variant="destructive"
                    className="h-10 px-4"
                    onClick={handleInternalLeave}
                >
                    <FontAwesomeIcon icon={faPhoneSlash} className="mr-2"/>
                    <span>Leave</span>
                </Button>
            </header>

            <div className="call-controls-container">
                 <Button className="call-control-btn" onClick={() => setIsMuted(!isMuted)}>
                    <FontAwesomeIcon icon={isMuted ? faMicrophoneSlash : faMicrophone} />
                    <span>Mic</span>
                </Button>
                 <Button className="call-control-btn" onClick={() => setIsCamOff(!isCamOff)}>
                    <FontAwesomeIcon icon={isCamOff ? faVideoSlash : faVideo} />
                    <span>Camera</span>
                </Button>
                <Button className="call-control-btn dark-grey">
                    <FontAwesomeIcon icon={faShare} />
                    <span>Share</span>
                </Button>
                <Dialog open={isLayoutDialogOpen} onOpenChange={setIsLayoutDialogOpen}>
                    {isCallAdmin && (
                        <DialogTrigger asChild>
                            <Button className="call-control-btn dark-grey">
                                <FontAwesomeIcon icon={faThLarge} />
                                <span>Layout</span>
                            </Button>
                        </DialogTrigger>
                    )}
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Choose Layout</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-3 gap-4 p-4">
                            <LayoutPreviewButton layoutNum={1} active={activeLayout === 1} onClick={handleSelectLayout}><div/></LayoutPreviewButton>
                            <LayoutPreviewButton layoutNum={2} active={activeLayout === 2} onClick={handleSelectLayout}><div/><div/></LayoutPreviewButton>
                            <LayoutPreviewButton layoutNum={3} active={activeLayout === 3} onClick={handleSelectLayout}><div/><div/><div/></LayoutPreviewButton>
                            <LayoutPreviewButton layoutNum={4} active={activeLayout === 4} onClick={handleSelectLayout}><div/><div/><div/><div/></LayoutPreviewButton>
                            <LayoutPreviewButton layoutNum={5} active={activeLayout === 5} onClick={handleSelectLayout}>
                                {[...Array(5)].map((_, i) => <div key={i} />)}
                            </LayoutPreviewButton>
                            <LayoutPreviewButton layoutNum={6} active={activeLayout === 6} onClick={handleSelectLayout}>
                                {[...Array(5)].map((_, i) => <div key={i} />)}
                            </LayoutPreviewButton>
                            <LayoutPreviewButton layoutNum={7} active={activeLayout === 7} onClick={handleSelectLayout}>
                                {[...Array(5)].map((_, i) => <div key={i} />)}
                            </LayoutPreviewButton>
                            <LayoutPreviewButton layoutNum={8} active={activeLayout === 8} onClick={handleSelectLayout}><div/><div/><div/><div/></LayoutPreviewButton>
                            <LayoutPreviewButton layoutNum={9} active={activeLayout === 9} onClick={handleSelectLayout}><div/><div/><div/></LayoutPreviewButton>
                            <LayoutPreviewButton layoutNum={10} active={activeLayout === 10} onClick={handleSelectLayout}><div/><div/></LayoutPreviewButton>
                            <LayoutPreviewButton layoutNum={11} active={activeLayout === 11} onClick={handleSelectLayout}>
                                {[...Array(9)].map((_, i) => <div key={i} />)}
                            </LayoutPreviewButton>
                            <LayoutPreviewButton layoutNum={12} active={activeLayout === 12} onClick={handleSelectLayout}>
                                {[...Array(13)].map((_, i) => <div key={i} />)}
                            </LayoutPreviewButton>
                        </div>
                    </DialogContent>
                </Dialog>
                <Button className="call-control-btn dark-grey">
                    <FontAwesomeIcon icon={faSmile} />
                    <span>Reacts</span>
                </Button>
            </div>

            <main className="call-body flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 w-full p-4">
                    {hasCameraPermission === false && (
                        <Alert variant="destructive">
                          <AlertTitle>Camera Access Required</AlertTitle>
                          <AlertDescription>
                            Please allow camera access in your browser settings to display your video.
                          </AlertDescription>
                        </Alert>
                    )}
                    {renderGridContent()}
                </div>
            </main>
        </div>
    );
}
