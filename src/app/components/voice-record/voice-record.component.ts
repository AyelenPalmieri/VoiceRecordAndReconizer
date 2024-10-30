import { Component, OnDestroy, OnInit } from '@angular/core';
import { AudioRecordingService, RecordedBlob } from '../../services/audio-recording.service';
import { DomSanitizer } from '@angular/platform-browser';
import { BehaviorSubject, Observable, Subject, timer } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-voice-record',
  templateUrl: './voice-record.component.html',
  styleUrls: ['./voice-record.component.css'],
})

export class VoiceRecordComponent implements OnInit, OnDestroy {
  blobUrl: any;
  isRecording = false;
  isActionInProgress = false;
  startTime = '0:00';
  isBlinking = false;
  audioSentSuccessfully = false;
  private recordedBlob!: RecordedBlob;
  private ngUnsubscribe = new Subject<void>();

  private buttonStateSubject = new BehaviorSubject<boolean>(true);
  buttonState$: Observable<boolean> = this.buttonStateSubject.asObservable();

  private showUseFirstTimeMessageSubject = new BehaviorSubject<boolean>(true);
  showUseFirstTimeMessage$: Observable<boolean> = this.showUseFirstTimeMessageSubject.asObservable();

  private blinkStopper = new Subject<void>();
  fileId: any;

  // Variables de habilitación secuencial de botones
  transcribedSuccessfully: boolean = false;

  constructor(
    private readonly audioRecordingServices: AudioRecordingService,
    private readonly sanitizer: DomSanitizer,
    private snackBar: MatSnackBar
  ) {
    this.buttonStateSubject.subscribe(isEnabled => {
      this.isActionInProgress = !isEnabled; // O cualquier lógica que necesites
    });
    this.getRecordedBlob();
    this.getRecordingTime();
    this.getRecordedFailed();
  }


  ngOnInit(): void {
    this.getRecordedCompleted();
  }

  private getRecordedCompleted() {
    this.audioRecordingServices.getRecordedCompleted().subscribe(() => {
    });
  }

  private getRecordedBlob() {
    this.audioRecordingServices.getRecordedBlob().subscribe(data => {
      this.blobUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(data.blob));
      this.recordedBlob = data;
    })
  }

  private getRecordingTime() {
    this.audioRecordingServices.getRecordingTime().subscribe(data =>
      this.startTime = data
    );
  }

  private getRecordedFailed() {
    this.audioRecordingServices.getRecordingTime().subscribe(data =>
      this.isRecording = false
    );
  }

  startRecording() {
    this.showUseFirstTimeMessageSubject.next(false);
    this.buttonStateSubject.next(false);
    // console.log('start recording');
    this.audioRecordingServices.startRecording();
    this.isRecording = true;
    this.isActionInProgress = true;
    // this.startBlinking();
    this.blobUrl = null;
  }

  stopRecording() {
    this.buttonStateSubject.next(true);
    // console.log('stop recording');
    this.audioRecordingServices.stopRecording();
    this.isRecording = false;
    this.isActionInProgress = false;
    // this.stopBlinking();
  }

  sendAudioToServer() {
    if (!this.isRecording && !this.isActionInProgress && this.recordedBlob) {
      this.audioRecordingServices.sendAudioToServer(this.recordedBlob.blob, this.recordedBlob.title)
        .subscribe(
          response => {
            console.log('Archivo de audio enviado con exito al servidor');
            console.log(this.recordedBlob)

            // Guardar el file_id que se recibe de la respuesta del backend
            this.fileId = response.file_id;

            this.audioSentSuccessfully = true; // Habilitar el botón de transcripción
            this.isActionInProgress = false;

            this.snackBar.open('¡El archivo de audio se ha enviado con exito al servidor!', 'Cerrar', {
              duration: 3000,
            });

            //this.audioSentSuccessfully = false;
          },
          error => {
            console.error('Error al enviar archivo de audio al servidor:', error);
            this.isActionInProgress = false;
          }
        );
    } else {
      console.error('No se grabó ningún audio o ya hay una grabación en curso.');
    }
  }

  transcribeAudio() {
    if (this.fileId && this.audioSentSuccessfully) {
      this.audioRecordingServices.transcribeAudio(this.fileId).subscribe(
        response => {
          console.log('Transcripción completada:', response.formatted_report);

          this.transcribedSuccessfully = true; // Habilitar guardar y descargar transcripción
          this.isActionInProgress = false;

          this.snackBar.open('Transcripción completada con éxito!', 'Cerrar', { duration: 3000 });
          // Manejar la transcripcion como mostrarla en CKEditor (NO IMPLEMENTADO)
        },
        error => {
          console.error('Error al transcribir el archivo:', error);
          this.isActionInProgress = false;
        }
      );
    } else {
      console.error('No se ha encontrado el file_id.');
    }
  }

  startBlinking() {
    // Primero cancelamos cualquier parpadeo anterior
    this.blinkStopper.next();
    this.isBlinking = true;
    timer(0, 1500) // Cada 1,5 segundos se repetirá el ciclo
      .pipe(
        takeUntil(this.blinkStopper), // Detiene el parpadeo cuando `blinkStopper` emite
        switchMap(() => {
          this.isBlinking = !this.isBlinking; // Alternamos el estado
          return timer(this.isBlinking ? 500 : 800); // Duración del encendido o apagado
        })
      )
      .subscribe();
  }

  stopBlinking() {
    this.blinkStopper.next(); // Cancela el parpadeo
    this.isBlinking = false; // Asegura que el estado esté apagado
  }

  deleteRecording() {
    if (!this.isRecording && !this.isActionInProgress) {
      console.log('delete recorded')
      this.audioRecordingServices.deleteRecording();
      this.blobUrl = null;
    }
  }

  downloadRecording() {
    if (!this.isRecording && !this.isActionInProgress) {
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(this.recordedBlob.blob);
      console.log(this.recordedBlob)
      downloadLink.download = this.recordedBlob.title;
      console.log('download recorded')
      downloadLink.click();
      downloadLink.remove();
    }
  }


  ngOnDestroy(): void {
    if (this.isRecording) {
      this.isRecording = false;
      this.audioRecordingServices.stopRecording();
      this.ngUnsubscribe.next();
      this.ngUnsubscribe.complete();
    }
  }

  downloadTranscription() {
    if (this.transcribedSuccessfully && this.fileId) {
      this.audioRecordingServices.downloadTranscription(this.fileId);
    }
  }

  saveTranscription() {
    if (this.transcribedSuccessfully && this.fileId) {
      this.audioRecordingServices.saveTranscription(this.fileId);
    }
  }

}
