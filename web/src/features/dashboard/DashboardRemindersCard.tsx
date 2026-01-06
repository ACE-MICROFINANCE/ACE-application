'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Card } from '@/share/ui/Card';
import { DashboardInfoItem } from './DashboardInfoItem';
import { appApi, type LoanCurrentResponse, type ScheduleItem } from '@/services/appApi';
import { formatCurrencyVND } from '@/lib/format';

type ReminderItem = {
  imageUrl: string;
  alt: string;
  text: ReactNode;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const daysUntil = (date: Date) =>
  Math.ceil((date.getTime() - startOfToday().getTime()) / MS_PER_DAY);

export const DashboardRemindersCard = ({
  includeLoanReminder = true, // CHANGED: hide loan reminder for staff/admin
}: {
  includeLoanReminder?: boolean;
}) => {
  const [loan, setLoan] = useState<LoanCurrentResponse | null>(null);
  const [events, setEvents] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [loanData, scheduleData] = await Promise.all([
          includeLoanReminder ? appApi.getCurrentLoan().catch(() => null) : Promise.resolve(null), // CHANGED: skip loan for staff/admin
          appApi.getSchedule().catch(() => [] as ScheduleItem[]),
        ]);

        if (!mounted) return;

        if (loanData) setLoan(loanData);
        setEvents(Array.isArray(scheduleData) ? scheduleData : []);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [includeLoanReminder]); // CHANGED: refresh when flag changes

  const reminders = useMemo<ReminderItem[]>(() => {
    if (loading) {
      const loadingItems: ReminderItem[] = [
        {
          imageUrl: '/img/farming-plant-rice.png',
          alt: 'Đang tải',
          text: 'Đang tải...',
        },
        {
          imageUrl: '/img/community-meeting.png',
          alt: 'Đang tải',
          text: 'Đang tải...',
        },
      ];

      if (includeLoanReminder) {
        loadingItems.splice(1, 0, {
          imageUrl: '/img/loan-payment.png',
          alt: 'Đang tải',
          text: 'Đang tải...',
        }); // CHANGED: only show loan placeholder when enabled
      }

      return loadingItems;
    }

    const safeEvents = Array.isArray(events) ? events : [];
    const items: ReminderItem[] = [];

    // Nhiệm vụ canh tác
    const farming = findNearest(safeEvents, 'FARMING_TASK');
    if (farming) {
      const diff = daysUntil(new Date(farming.startDate));
      const text =
        diff === 0
          ? `Hôm nay: ${farming.title.toLowerCase()}.`
          : `Trong ${diff} ngày nữa: ${farming.title.toLowerCase()}.`;

      items.push({
        imageUrl: '/img/farming-plant-rice.png',
        alt: 'Lịch canh tác',
        text,
      });
    }

    // Nhắc thanh toán
    if (includeLoanReminder && loan?.nextPayment?.dueDate) { // CHANGED: hide loan reminder for staff/admin
      const due = new Date(loan.nextPayment.dueDate);
      const diff = daysUntil(due);

      const amountValue =
        loan.nextPayment.totalDue ??
        loan.nextPayment.principalDue ??
        0;

      const amountNode = (
        <span className="font-semibold text-slate-900">
          {formatCurrencyVND(amountValue)}
        </span>
      );

      const text =
        diff === 0 ? (
          <>Hôm nay đến hạn thanh toán {amountNode}.</>
        ) : (
          <>Trong {diff} ngày nữa, khoản thanh toán {amountNode} sẽ đến hạn.</>
        );

      items.push({
        imageUrl: '/img/loan-payment.png',
        alt: 'Nhắc thanh toán',
        text,
      });
    }

    // Họp nhóm
    const meeting = findNearest(safeEvents, 'MEETING');
    if (meeting) {
      const diff = daysUntil(new Date(meeting.startDate));
      const text =
        diff === 0
          ? 'Bạn có cuộc họp hôm nay.'
          : `Bạn có cuộc họp trong ${diff} ngày tới.`;

      items.push({
        imageUrl: '/img/community-meeting.png',
        alt: 'Họp nhóm',
        text,
      });
    }

    return items;
  }, [events, loan, loading, includeLoanReminder]); // CHANGED: include flag in memo

  if (!reminders.length) return null;

  return (
    <div className="space-y-3">
      {reminders.map((item, idx) => (
        <Card
          key={`${idx}`}
          className="rounded-2xl bg-white shadow p-4"
        >
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

const findNearest = (events: ScheduleItem[], type: string) => {
  if (!Array.isArray(events)) return undefined;

  const today = startOfToday();

  return events
    .filter((e) => e.eventType === type)
    .map((e) => ({ ...e, date: new Date(e.startDate) }))
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
};
