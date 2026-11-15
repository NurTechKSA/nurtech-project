import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import updateLocale from 'dayjs/plugin/updateLocale';

const MONTHS_SHORT_RU = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

export function configureDayjs(): void {
  dayjs.extend(updateLocale);
  dayjs.locale('ru');
  dayjs.updateLocale('ru', { monthsShort: MONTHS_SHORT_RU });
}
