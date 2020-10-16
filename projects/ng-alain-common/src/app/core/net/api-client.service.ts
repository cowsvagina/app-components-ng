import { Inject, Injectable } from '@angular/core';
import { HttpErrorResponse, HttpParams, HttpUrlEncodingCodec } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { APIResponse } from '@core';
import { _HttpClient } from '@delon/theme';
import { environment } from '@env/environment';
import { DA_SERVICE_TOKEN, ITokenService } from '@delon/auth';

/**
 * 默认配置中对所有HTTP请求都会强制 [校验](https://ng-alain.com/auth/getting-started) 用户 Token
 * 然一般来说登录请求不需要校验，因此可以在请求URL加上：`/login?_allow_anonymous=true` 表示不触发用户 Token 校验
 */
@Injectable({
  providedIn: 'root',
})
export class ApiClientService {
  // API请求,客户端应该携带这个header上行,见api.interceptor.ts
  public static APIRequestHeader = 'X-Api-Request';
  // API响应,服务器端携带这个header下行,见api.interceptor.ts
  public static APIResponseHeader = 'X-Api-Response';

  constructor(private client: _HttpClient, @Inject(DA_SERVICE_TOKEN) private tokenService: ITokenService) {}

  get isLoading(): boolean {
    return this.client.loading;
  }

  get(uri: string, params: {}) {
    const options = this.prepareOptions();
    options.params = new HttpParams({ fromObject: params });
    return this.client.get(uri, options).pipe(
      mergeMap((response: APIResponse<any>) => {
        return of(response);
      }),
      catchError((response: HttpErrorResponse) => {
        return throwError(response.error);
      }),
    );
  }

  post(uri: string, params: {}) {
    const httpParams: any = new HttpParams({
      fromObject: params,
      encoder: new HttpUrlEncodingCodec(),
    });
    const options = this.prepareOptions();
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';

    return this.client.post(uri, httpParams, options).pipe(
      mergeMap((response: APIResponse<any>) => {
        return of(response);
      }),
      catchError((response: HttpErrorResponse) => {
        return throwError(response.error);
      }),
    );
  }

  put(uri: string, params: {}) {
    const httpParams: any = new HttpParams({
      fromObject: params,
      encoder: new HttpUrlEncodingCodec(),
    });
    const options = this.prepareOptions();
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';

    return this.client.put(uri, httpParams, options).pipe(
      mergeMap((response: APIResponse<any>) => {
        return of(response);
      }),
      catchError((response: HttpErrorResponse) => {
        return throwError(response.error);
      }),
    );
  }

  patch(uri: string, params: {}) {
    const httpParams: any = new HttpParams({
      fromObject: params,
      encoder: new HttpUrlEncodingCodec(),
    });
    const options = this.prepareOptions();
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';

    return this.client.patch(uri, httpParams, options).pipe(
      mergeMap((response: APIResponse<any>) => {
        return of(response);
      }),
      catchError((response: HttpErrorResponse) => {
        return throwError(response.error);
      }),
    );
  }

  delete(uri, params: {}) {
    const options = this.prepareOptions();
    options.params = new HttpParams({ fromObject: params });
    return this.client.delete(uri, options).pipe(
      mergeMap((response: APIResponse<any>) => {
        return of(response);
      }),
      catchError((response: HttpErrorResponse) => {
        return throwError(response.error);
      }),
    );
  }

  private prepareOptions() {
    let options: {
      headers?: {
        [header: string]: string | string[];
      };
      observe?: 'body';
      params?:
        | HttpParams
        | {
            [param: string]: string | string[];
          };
      reportProgress?: boolean;
      responseType?: 'json';
      withCredentials?: boolean;
    } = {
      headers: {},
      withCredentials: true,
    };
    options.headers[ApiClientService.APIRequestHeader] = '1';
    if (environment.useMock) {
      let t = this.tokenService.get().token;
      options.headers['Authorization'] = t || '';
    }

    return options;
  }
}
