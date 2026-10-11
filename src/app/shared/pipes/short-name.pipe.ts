import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'shortName' })
export class ShortNamePipe implements PipeTransform {
  transform(name: string): string {
    const [firstName = '', lastName] = name.split(' ').filter(Boolean);

    return lastName ? `${firstName} ${lastName.charAt(0)}.` : firstName;
  }
}
