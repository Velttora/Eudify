'use client';

import type { EventInput } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import FullCalendar from '@fullcalendar/react';
import { useMemo } from 'react';

import type { AppointmentRow } from '@/features/appointments/api/appointments-api';
import {
  appointmentStatusLabelEs,
  apptCalendarEventClasses,
} from '@/features/appointments/lib/appointment-status-ui';

function scheduledLessons(appointments: AppointmentRow[]) {
  return appointments.filter(
    (a) =>
      a.status === 'PENDING' ||
      a.status === 'CONFIRMED' ||
      a.status === 'COMPLETED',
  );
}

function toEvents(appointments: AppointmentRow[]): EventInput[] {
  return scheduledLessons(appointments).map((a) => {
    const child = a.child?.firstName ?? '—';
    const edu = a.providerProfile.fullName?.trim() || 'Educador';
    const offer =
      (a.offerTitleSnapshot && a.offerTitleSnapshot.trim()) ||
      (a.providerOffer?.title && a.providerOffer.title.trim()) ||
      '';
    const offerBit = offer ? ` · ${offer}` : '';
    const statusBit =
      a.status === 'PENDING' && a.requestsAlternativeSchedule
        ? ` · ${appointmentStatusLabelEs(a)}`
        : '';
    return {
      id: a.id,
      title: `${child} · ${edu}${offerBit}${statusBit}`,
      start: a.startsAt,
      end: a.endsAt,
      classNames: apptCalendarEventClasses(
        a.status,
        Boolean(a.requestsAlternativeSchedule),
      ),
    };
  });
}

export function ConsumerLessonsCalendarCore({
  appointments,
  height = 440,
}: {
  appointments: AppointmentRow[];
  height?: number | string;
}) {
  const events = useMemo(() => toEvents(appointments), [appointments]);
  const count = scheduledLessons(appointments).length;

  return (
    <div className="space-y-3">
      {count === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cuando tengas citas pendientes o confirmadas, aparecerán en el
          calendario. Puedes solicitar una desde{' '}
          <span className="font-medium text-foreground">Explorar educadores</span>.
        </p>
      ) : null}
      <div className="availability-fc text-foreground">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
          locale={esLocale}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek',
          }}
          buttonText={{
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            list: 'Lista',
          }}
          height={height}
          expandRows
          firstDay={1}
          events={events}
          dayMaxEvents={4}
          nowIndicator
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
          }}
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
          }}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          eventDidMount={(info) => {
            const { event } = info;
            const start = event.start;
            const end = event.end;
            if (start && end) {
              const a = start.toLocaleString('es', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });
              const b = end.toLocaleTimeString('es', { timeStyle: 'short' });
              info.el.title = `${event.title}\n${a} – ${b}`;
            }
          }}
        />
      </div>
    </div>
  );
}
