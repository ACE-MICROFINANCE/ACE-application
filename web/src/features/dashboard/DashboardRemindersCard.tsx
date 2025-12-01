'use client';

import { Card } from '@/share/ui/Card';
import { DashboardInfoItem } from './DashboardInfoItem';

export const DashboardRemindersCard = () => {
  const reminders = [
    {
      imageUrl: '/img/farming-plant-rice.png',
      alt: 'Farming schedule',
      text: 'In 21 days, it will be time to plant the rice seedlings.',
    },
    {
      imageUrl: '/img/loan-payment.png',
      alt: 'Loan reminder',
      text: 'In 7 days, the interest payment will be due.',
    },
    {
      imageUrl: '/img/community-meeting.png',
      alt: 'Community meeting',
      text: 'You have a meeting in the next 5 days.',
    },
  ];

  return (
    <div className="space-y-3">
      {reminders.map((item) => (
        <Card key={item.text} className="rounded-2xl bg-white shadow p-4">
          <DashboardInfoItem
            imageUrl={item.imageUrl}
            alt={item.alt}
            text={item.text}
            showDivider={false}
          />
        </Card>
      ))}
    </div>
  );
};
