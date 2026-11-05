import { StatusCategory } from '../enums/status-category.enum';
import { StatusColor } from '../enums/status-color.enum';

export interface Status {
  id: string;
  name: string;
  color: StatusColor;
  category: StatusCategory;
  requiresReason: boolean;
}
