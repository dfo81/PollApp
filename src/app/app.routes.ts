import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { SurveyView } from './components/survey-view/survey-view';
import { CreateSurvey } from './components/create-survey/create-survey';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'create', component: CreateSurvey, data: { light: true } },
  { path: 'survey/:id', component: SurveyView, data: { light: true } },
];
