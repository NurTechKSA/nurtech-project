import { HttpContextToken } from '@angular/common/http';

export const SKIP_ERROR_NOTIFICATION = new HttpContextToken(() => false);
