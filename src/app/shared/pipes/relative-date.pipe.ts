import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import relativeTime from 'dayjs/plugin/relativeTime';
import updateLocale from 'dayjs/plugin/updateLocale';

dayjs.extend(relativeTime);
dayjs.extend(updateLocale);
dayjs.locale('ru');
dayjs.updateLocale('ru', {
  monthsShort: 'янв_фев_мар_апр_мая_июн_июл_авг_сен_окт_ноя_дек'.split('_'),
  relativeTime: {
    ...dayjs.Ls['ru'].relativeTime,
    m: '1 минуту',
    h: '1 час',
    d: '1 день',
  },
});

@Pipe({ name: 'relativeDate' })
export class RelativeDatePipe implements PipeTransform {
  transform(value: Date | string): string {
    const date = dayjs(value);
    const now = dayjs();

    if (now.diff(date, 'second') < 60) {
      return 'только что';
    }

    const diffDays = now.startOf('day').diff(date.startOf('day'), 'day');

    if (diffDays > 7) {
      return date.format('D MMM');
    }

    if (diffDays === 1) {
      return 'вчера';
    }

    return diffDays >= 2
      ? now.subtract(diffDays, 'day').from(now)
      : date.from(now);
  }
}
