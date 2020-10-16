import { Injectable } from '@angular/core';
import { ACLService } from '@delon/acl';
import { MenuService } from '@delon/theme';

@Injectable({
  providedIn: 'root',
})
export class PrivilegeService {
  constructor(private aclService: ACLService, private menuService: MenuService) {}

  updatePrivileges(privilegeIDs: number[], isSuperman: boolean = false) {
    if (isSuperman) {
      this.aclService.setFull(true);
    } else {
      this.aclService.setAbility(privilegeIDs);
    }
    this.menuService.resume();
  }

  clear() {
    this.aclService.setFull(false);
    this.aclService.setAbility([]);
    this.menuService.resume();
  }
}
