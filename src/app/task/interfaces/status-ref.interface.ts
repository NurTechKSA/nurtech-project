import { Status } from './status.interface';

export type StatusRef = Pick<Status, 'id' | 'name' | 'color' | 'category'>;
