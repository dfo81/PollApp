import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

/** Starts the app with the shell component and the providers of {@link appConfig}. */
bootstrapApplication(App, appConfig).catch((err) => console.error(err));
