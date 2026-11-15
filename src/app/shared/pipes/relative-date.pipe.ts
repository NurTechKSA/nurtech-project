import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs';

const JUST_NOW_SECONDS = 60;
const MAX_RELATIVE_DAYS = 7;
const RELATIVE_TIME_FORMAT = new Intl.RelativeTimeFormat('ru');

@Pipe({ name: 'relativeDate' })
export class RelativeDatePipe implements PipeTransform {
  transform(value: Date | string): string {
    const date = dayjs(value);
    const now = dayjs();

    if (now.diff(date, 'second') < JUST_NOW_SECONDS) {
      return 'только что';
    }

    const diffDays = now.startOf('day').diff(date.startOf('day'), 'day');

    if (diffDays === 0) {
      const diffHours = now.diff(date, 'hour');

      return diffHours === 0
        ? RELATIVE_TIME_FORMAT.format(-now.diff(date, 'minute'), 'minute')
        : RELATIVE_TIME_FORMAT.format(-diffHours, 'hour');
    }

    if (diffDays === 1) {
      return 'вчера';
    }

    if (diffDays <= MAX_RELATIVE_DAYS) {
      return RELATIVE_TIME_FORMAT.format(-diffDays, 'day');
    }

    return date.format('D MMM');
  }
}
