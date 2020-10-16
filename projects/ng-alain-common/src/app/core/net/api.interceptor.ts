import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
  HttpResponseBase,
} from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { DA_SERVICE_TOKEN, ITokenService, JWTTokenModel } from '@delon/auth';
import { _HttpClient } from '@delon/theme';
import { environment } from '@env/environment';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, filter, mergeMap, switchMap, take, tap } from 'rxjs/operators';
import { SessionService } from '@app/session';
import { APIResponse } from '@core/net/APIResponse';
import { NzMessageService } from 'ng-zorro-antd';
import { ApiClientService } from '@core/net/api-client.service';

/**
 * API接口HTTP拦截器，其注册细节见 `app.module.ts`
 */
@Injectable()
export class APIInterceptor implements HttpInterceptor {
  private static responseTokenHeader = 'X-Token';
  private static refreshTokenURI = '/api/auth/refresh';

  // 是否开启当 Token 过期后重新调用刷新 Token 接口，并在刷新 Token 后再一次发起请求
  private refreshTokenEnabled = false;
  private refreshToking = false;
  private refreshToken$: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private injector: Injector, private sessionService: SessionService, private msg: NzMessageService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let url = req.url;
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      let path = url;
      if (url.startsWith('/')) {
        path = url.substr(1);
      }
      url = environment.SERVER_URL + path;
    }

    const tokenModel = this.injector.get(DA_SERVICE_TOKEN).get<JWTTokenModel>(JWTTokenModel);
    const newReq = req.clone({
      url,
      setHeaders: {
        Authorization: `Bearer ${tokenModel?.token || ''}`,
      },
    });
    return next.handle(newReq).pipe(
      mergeMap((event: any) => {
        if (event instanceof HttpResponseBase) {
          return this.isAPIResponse(event) ? this.handleApiData(event, newReq, next) : this.handleData(event, newReq, next);
        }
        // 什么情况不是响应?
        console.log('response is not HTTP Response', event);
        return of(event);
      }),
      catchError((err: HttpErrorResponse) => {
        return this.isAPIResponse(err) ? this.handleApiData(err, newReq, next) : this.handleData(err, newReq, next);
      }),
    );
  }

  private handleApiData(resp: HttpResponseBase, req: HttpRequest<any>, next: HttpHandler): Observable<any> {
    // 可能会因为 `throw` 导出无法执行 `_HttpClient` 的 `end()` 操作
    if (resp.status > 0) {
      this.injector.get(_HttpClient).end();
    }

    if (resp.status === 401) {
      return this.tryRefreshToken(resp, req, next);
    }

    const apiResponse = this.getAPIResponse(resp);
    this.sessionService.update(resp.headers.get(APIInterceptor.responseTokenHeader) || '');
    if (apiResponse.errorCode !== 0) {
      this.msg.error(apiResponse.errorMsg);
    }

    if (resp instanceof HttpErrorResponse) {
      return throwError(resp);
    } else {
      return of(resp);
    }
  }

  private handleData(resp: HttpResponseBase, req: HttpRequest<any>, next: HttpHandler): Observable<any> {
    // 可能会因为 `throw` 导出无法执行 `_HttpClient` 的 `end()` 操作
    if (resp.status > 0) {
      this.injector.get(_HttpClient).end();
    }

    if (resp instanceof HttpErrorResponse) {
      return throwError(resp);
    } else {
      return of(resp);
    }
  }

  private tryRefreshToken(resp: HttpResponseBase, req: HttpRequest<any>, next: HttpHandler): Observable<any> {
    if (!this.refreshTokenEnabled) {
      const apiResponse = this.getAPIResponse(resp);
      if (apiResponse && apiResponse.errorMsg) {
        this.unauthorizedToLogin(apiResponse.errorMsg);
      } else {
        this.unauthorizedToLogin();
      }
      return throwError(resp);
    }

    return this.refreshToken(resp, req, next);
  }

  private refreshToken(ev: HttpResponseBase, req: HttpRequest<any>, next: HttpHandler): Observable<any> {
    // 1、若上一个请求为刷新Token请求，说明刷新失败, 回调登录页
    if ([APIInterceptor.refreshTokenURI].some((url) => req.url.includes(url))) {
      this.unauthorizedToLogin();
      return throwError(ev);
    }
    // 2、如果 `refreshToking` 为 `true` 表示已经在请求刷新 Token 中，后续所有请求转入等待状态，直至结果返回后再重新发起请求
    if (this.refreshToking) {
      return this.refreshToken$.pipe(
        filter((v) => !!v),
        take(1),
        switchMap(() => next.handle(this.reAttachToken(req))),
      );
    }
    // 3、尝试调用刷新 Token
    this.refreshToking = true;
    this.refreshToken$.next(null);

    return this.refreshTokenRequest().pipe(
      switchMap((res) => {
        // 通知后续请求继续执行
        this.refreshToking = false;
        this.refreshToken$.next(res);
        // 重新保存新 token
        this.tokenService.set(res);
        // 重新发起请求
        return next.handle(this.reAttachToken(req));
      }),
      catchError((err) => {
        this.refreshToking = false;
        this.unauthorizedToLogin();
        return throwError(err);
      }),
    );
  }

  /**
   * 刷新 Token 请求
   */
  private refreshTokenRequest(): Observable<any> {
    const model = this.tokenService.get<JWTTokenModel>(JWTTokenModel);
    return this.http.post(APIInterceptor.refreshTokenURI, null, null, {
      headers: {
        'X-Refresh-Token': model?.token || '',
      },
    });
  }

  /**
   * 重新附加新 Token 信息
   *
   * > 由于已经发起的请求，不会再走一遍 `@delon/auth` 因此需要结合业务情况重新附加新的 Token
   */
  private reAttachToken(req: HttpRequest<any>): HttpRequest<any> {
    const token = this.tokenService.get().token;
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private get tokenService(): ITokenService {
    return this.injector.get(DA_SERVICE_TOKEN);
  }

  private unauthorizedToLogin(errText: string = '未登录或登录已过期,请重新登录'): void {
    this.sessionService.clear();
    this.msg.error(errText);
    this.goTo(this.sessionService.loginURI);
  }

  private goTo(url: string) {
    setTimeout(() => this.injector.get(Router).navigateByUrl(url));
  }

  private get http(): _HttpClient {
    return this.injector.get(_HttpClient);
  }

  private isAPIResponse(resp: HttpResponseBase): boolean {
    return resp.headers.get(ApiClientService.APIResponseHeader) === '1';
  }

  private getAPIResponse(resp: HttpResponseBase): APIResponse<any> | null {
    let apiResponse: APIResponse<any> | null = null;
    if (this.isAPIResponse(resp)) {
      if (resp instanceof HttpErrorResponse) {
        apiResponse = resp.error;
      } else if (resp instanceof HttpResponse) {
        apiResponse = resp.body;
      }
    }
    return apiResponse;
  }
}
