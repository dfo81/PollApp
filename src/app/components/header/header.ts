import { Component, input } from '@angular/core';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  // true  = light page -> dark logo
  // false = dark page  -> light logo
  readonly light = input(false);

  // "Create survey"-Button anzeigen (nur auf Survey-Seiten, ab Desktop)
  readonly createButton = input(false);
}
