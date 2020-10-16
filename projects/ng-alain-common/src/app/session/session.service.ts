import { Inject, Injectable } from '@angular/core';
import { DA_SERVICE_TOKEN, ITokenService, JWTTokenModel } from '@delon/auth';
import { PrivilegeService } from './privilege';
import { AdminService } from './admin-service';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  constructor(
    @Inject(DA_SERVICE_TOKEN) private tokenService: ITokenService,
    private privilegeService: PrivilegeService,
    private adminService: AdminService,
  ) {
  }

  update(token: string) {
    if (!token) {
      return;
    }

    this.tokenService.set({token});
    const tokenModel = this.tokenService.get<JWTTokenModel>(JWTTokenModel);
    this.adminService.setAdminInfo(tokenModel.payload[`adminInfo`]);
    const privilege = tokenModel.payload[`adminPrivilege`];
    this.privilegeService.updatePrivileges(privilege.list, privilege.isSuperman);
  }

  clear() {
    this.tokenService.clear();
    this.privilegeService.clear();
    this.adminService.clear();
  }

  get loginURI(): string {
    return '/passport/login'; // this.tokenService.login_url!;
  }
}
