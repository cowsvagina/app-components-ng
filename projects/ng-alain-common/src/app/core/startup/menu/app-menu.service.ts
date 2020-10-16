import { Injectable } from '@angular/core';
import { Menus } from '@core/startup/menu/menu';
import { Menu } from '@delon/theme';

@Injectable({
  providedIn: 'root',
})
export class AppMenuService {
  constructor() {}

  getMenus(): Menu[] {
    return Menus;
  }
}
