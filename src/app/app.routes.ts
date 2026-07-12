import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { SurveyView } from './components/survey-view/survey-view';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'survey/:id', component: SurveyView, data: { light: true } },
];
