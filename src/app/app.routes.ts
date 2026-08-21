import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { SurveyView } from './components/survey-view/survey-view';
import { Legal } from './components/legal/legal';

/**
 * Routes of the app. The data of a route drives the shell: `light` switches to the
 * light theme, `createButton` shows the create button in the header.
 *
 * Creating a survey deliberately has no route of its own, it is an overlay.
 */
export const routes: Routes = [
  { path: '', component: Home },
  { path: 'survey/:id', component: SurveyView, data: { light: true, createButton: true } },
  { path: 'legal', component: Legal },
];
