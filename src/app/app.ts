import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { Header } from './components/header/header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    '[class.light-page]': 'light()',
  },
})
export class App {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // feuert bei jeder abgeschlossenen Navigation neu
  private readonly navEnd = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)),
  );

  // Data der aktuell aktiven (tiefsten) Route
  private readonly routeData = computed(() => {
    this.navEnd();
    let route = this.route;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.snapshot.data;
  });

  // helle Seite (weißer Hintergrund + dunkles Logo), gesteuert über Route-Data { light: true }
  protected readonly light = computed(() => this.routeData()['light'] ?? false);

  // "Create survey"-Button nur auf Survey-Seiten, gesteuert über Route-Data { createButton: true }
  protected readonly createButton = computed(() => this.routeData()['createButton'] ?? false);
}
