'use client';

type DashboardInfoItemProps = {
  imageUrl: string;
  alt: string;
  text: string;
  showDivider?: boolean;
};

export const DashboardInfoItem = ({ imageUrl, alt, text, showDivider }: DashboardInfoItemProps) => {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-4 py-3">
        <img
          src={imageUrl}
          alt={alt}
          className="h-16 w-16 rounded-full object-cover flex-shrink-0"
        />
        <p className="text-sm text-slate-800 leading-snug">{text}</p>
      </div>
      {showDivider ? <div className="border-t border-slate-200 mt-3" /> : null}
    </div>
  );
};
