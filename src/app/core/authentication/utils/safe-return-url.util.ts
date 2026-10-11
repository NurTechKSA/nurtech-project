import { AppPath } from '@core/enums/app-path.enum';

export function getSafeReturnUrl(url: string | null): string {
  if (url?.startsWith('/') && !url.startsWith('//')) {
    return url;
  }

  return `/${AppPath.ROOT}`;
}
