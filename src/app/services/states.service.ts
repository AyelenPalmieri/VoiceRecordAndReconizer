import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ButtonStates {
  blobState: boolean;
  uploadState: boolean;
  transcribeState: boolean;
}

@Injectable({
  providedIn: 'root'
})
/**
 * Provee y almacena la información del boton, se utiliza para el manejo de botones
 */
export class StatesService {
   // Estado inicial de los botones
   private initialState: ButtonStates = {
    blobState: false,
    uploadState: false,
    transcribeState: false,
  };

  // BehaviorSubject para el estado del botón
  private buttonStateSubject = new BehaviorSubject<ButtonStates>(this.initialState);
  buttonState$ = this.buttonStateSubject.asObservable();

  // Método para actualizar el estado de los botones
  setButtonState(newState: Partial<ButtonStates>) {
    const currentState = this.buttonStateSubject.getValue();
    this.buttonStateSubject.next({ ...currentState, ...newState });
  }
}
