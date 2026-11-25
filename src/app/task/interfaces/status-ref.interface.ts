import { Status } from '../../dictionary/interfaces/status.interface';

export type StatusRef = Pick<Status, 'id' | 'name' | 'color' | 'category'>;
