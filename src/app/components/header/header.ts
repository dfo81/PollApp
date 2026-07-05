import { Component, input } from '@angular/core';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  // true  = helle Seite  -> dunkles Logo
  // false = dunkle Seite -> helles Logo
  readonly light = input(false);
}
