import { StatusRef } from './status-ref.interface';

export interface Status extends StatusRef {
  requiresReason: boolean;
}
