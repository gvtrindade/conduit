import { CrewMember } from '@/lib/types';

interface CrewAvatarsProps {
  crew: CrewMember[];
  size?: 'sm' | 'md';
}

export default function CrewAvatars({ crew, size = 'sm' }: CrewAvatarsProps) {
  const sizeClasses = size === 'sm'
    ? 'w-[22px] h-[22px] text-[7px] -ml-1.5'
    : 'w-8 h-8 text-[10px] -ml-2';

  return (
    <div className="flex">
      {crew.map((member, i) => (
        <div
          key={i}
          className={`${sizeClasses} rounded-full border-[1.5px] border-panel bg-panel2 flex items-center justify-center font-mono font-bold text-cream flex-shrink-0 ${i === 0 ? '!ml-0' : ''}`}
          style={{ background: member.color }}
          title={member.name}
        >
          {member.initials}
        </div>
      ))}
    </div>
  );
}
