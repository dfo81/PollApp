import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Surveys } from '../surveys/surveys';

@Component({
  selector: 'app-home',
  imports: [Surveys, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {

}
