import { Pipe, PipeTransform } from '@angular/core';

import { dayjs } from '../config/dayjs.config';

@Pipe({ name: 'relativeDate' })
export class RelativeDatePipe implements PipeTransform {
  transform(value: Date | string): string {
    return dayjs(value).fromNow();
  }
}
