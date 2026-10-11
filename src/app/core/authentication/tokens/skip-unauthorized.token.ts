import { HttpContextToken } from '@angular/common/http';

export const SKIP_UNAUTHORIZED = new HttpContextToken(() => false);
