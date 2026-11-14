import { Status } from '@core/project/interfaces/status.interface';

export type StatusRef = Pick<Status, 'id' | 'name' | 'color' | 'category'>;
