import { StatusRef } from './status-ref.interface';

export interface LinkedTask {
  id: string;
  key: string;
  title: string;
  status: StatusRef;
}
