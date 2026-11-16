import { Status } from '@status/interfaces/status.interface';

export type StatusRef = Pick<Status, 'id' | 'name' | 'color' | 'category'>;
