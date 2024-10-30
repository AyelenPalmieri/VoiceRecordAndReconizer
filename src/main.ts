import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import lottie from 'lottie-web';
import { defineElement } from '@lordicon/element';

// define "lord-icon" custom element with default properties
defineElement(lottie.loadAnimation);

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
