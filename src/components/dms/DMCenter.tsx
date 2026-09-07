'use client';

import { useDM } from '@/contexts/DMProvider';
import { DMWindow } from './DMWindow';

export function DMCenter() {
  const { openDMs } = useDM();

  return (
    <>
      {openDMs.map((user, index) => (
        <DMWindow key={user.id} recipient={user} index={index} />
      ))}
    </>
  );
}
