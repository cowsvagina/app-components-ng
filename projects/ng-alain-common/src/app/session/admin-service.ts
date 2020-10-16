import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private info = {
    adminID: 0,
    loginID: '',
    displayName: '',
  };

  setAdminInfo(info: Record<string, any>) {
    this.info.adminID = info.adminID;
    this.info.loginID = info.loginID;
    this.info.displayName = info.displayName;
  }

  clear() {
    this.info.adminID = 0;
    this.info.loginID = '';
    this.info.displayName = '';
  }

  get adminID(): number {
    return this.info.adminID;
  }

  get loginID(): string {
    return this.info.loginID;
  }

  get displayName(): string {
    return this.info.displayName;
  }
}
