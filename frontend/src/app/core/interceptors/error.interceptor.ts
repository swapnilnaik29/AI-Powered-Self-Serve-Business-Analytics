import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'An unexpected error occurred';

      if (error.error?.error?.message) {
        message = error.error.error.message;
      } else if (error.status === 0) {
        message = 'Unable to connect to the server';
      } else if (error.status === 429) {
        message = 'Too many requests. Please wait a moment.';
      } else if (error.status >= 500) {
        message = 'Server error. Please try again later.';
      }

      console.error(`[API Error] ${req.method} ${req.url}: ${error.status} - ${message}`);

      return throwError(() => ({ status: error.status, message }));
    })
  );
};
