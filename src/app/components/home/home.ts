import { Component } from '@angular/core';
import { Surveys } from '../surveys/surveys';

@Component({
  selector: 'app-home',
  imports: [Surveys],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {

}
