import { Component, OnDestroy, OnInit } from '@angular/core';
import { AudioRecordingService, RecordedBlob } from '../../services/audio-recording.service';
import { DomSanitizer } from '@angular/platform-browser';
import { BehaviorSubject, Observable, Subject, timer } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StatesService } from '../../services/states.service';
import { state } from '@angular/animations';
@Component({
  selector: 'app-voice-record',
  templateUrl: './voice-record.component.html',
  styleUrls: ['./voice-record.component.css'],
})

export class VoiceRecordComponent implements OnInit, OnDestroy {
  blobUrl: any;
  fileId: any;
  isRecording = false;
  isActionInProgress = false;
  startTime = '0:00';
  isBlinking = false;
  audioSentSuccessfully = false;
  isTranscriptionReady = false;
  private recordedBlob!: RecordedBlob;
  private ngUnsubscribe = new Subject<void>();
  private blinkStopper = new Subject<void>();

  disableDeleted = true;
  disableDownload = true;
  disableUpload = true;

  private recordingButtonVisibilitySubject = new BehaviorSubject<boolean>(true);
  recordingButtonVisibility$: Observable<boolean> = this.recordingButtonVisibilitySubject.asObservable();

  private showUseFirstTimeMessageSubject = new BehaviorSubject<boolean>(true);
  showUseFirstTimeMessage$: Observable<boolean> = this.showUseFirstTimeMessageSubject.asObservable();

  // Variables de habilitación secuencial de botones
  transcribedSuccessfully: boolean = false;

  constructor(
    private readonly audioRecordingServices: AudioRecordingService,
    private readonly sanitizer: DomSanitizer,
    private snackBar: MatSnackBar,
    public stateService: StatesService
  ) {
    this.stateService.buttonState$.subscribe((state: { blobState: any; }) => {
      // this.isActionInProgress = !state.blobState;
      this.disableDeletedMethod(state);
      this.disableDownloadMethod(state);
      this.disableUploadMethod(state);

    });
    this.getRecordedBlob();
    this.getRecordingTime();
    this.getRecordedFailed();
  }


  disableUploadMethod(state: { blobState: any; }) {
    if (state.blobState == false) {
      this.disableUpload = true
    }
    if (state.blobState == true) {
      this.disableUpload = false
    }
  }

  disableDownloadMethod(state: { blobState: any; }) {
    if (state.blobState == false) {
      this.disableDownload = true
    }
    if (state.blobState == true) {
      this.disableDownload= false
    }
  }

  disableDeletedMethod(state:{ blobState: any; }) {
    if (state.blobState == false) {
      this.disableDeleted = true
    }
    if (state.blobState == true) {
      this.disableDeleted = false
    }
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
    this.stateService.setButtonState({blobState: false})
    this.recordingButtonVisibilitySubject.next(false);
    // console.log('start recording');
    this.audioRecordingServices.startRecording();
    this.isRecording = true;
    this.isActionInProgress = true;
    // this.startBlinking();
    this.blobUrl = null;
  }

  stopRecording() {
    this.recordingButtonVisibilitySubject.next(true);
    this.stateService.setButtonState({
      blobState: true,
      uploadState: true,
      transcribeState: true
    })
    // console.log('stop recording');
    this.audioRecordingServices.stopRecording();
    this.isRecording = false;
    this.isActionInProgress = false;
    this.isTranscriptionReady = false;
    // this.stopBlinking();
  }

  sendAudioToServer() {
    if (!this.isRecording && !this.isActionInProgress && this.recordedBlob) {
      // Establecer uploadState en true al iniciar el proceso de envío
      this.stateService.setButtonState({ uploadState: true });

      this.audioRecordingServices.sendAudioToServer(this.recordedBlob.blob, this.recordedBlob.title)
        .subscribe(
          response => {
            console.log('Archivo de audio enviado con exito al servidor');
            console.log(this.recordedBlob)

            // Guardar el file_id que se recibe de la respuesta del backend
            if (response && response.file_id) {
              this.fileId = response.file_id;
              this.audioSentSuccessfully = true; // Habilitar el botón de transcripción
              this.stateService.setButtonState({
                blobState: false,
                uploadState: true,
                transcribeState: false
              }); // Solo si el backend confirma el guardado
            }

            this.isActionInProgress = false;

            // // Mantener uploadState en true para reflejar que el archivo esta guardado
            // this.stateService.setButtonState({
            //   blobState: false,
            //   uploadState: true,
            //   transcribeState: false
            // });
            this.snackBar.open('¡El archivo de audio se ha enviado con exito al servidor!', 'Cerrar', {
              duration: 3000,
            });

            //this.audioSentSuccessfully = false;
          },
          error => {
            this.snackBar.open('Error al enviar archivo de audio al servidor', 'Cerrar', {
              duration: 3000,
            });
            console.error('Error al enviar archivo de audio al servidor:', error);
            this.isActionInProgress = false;

            // Establecer uploadState en false para indicar que el envio fallo
            this.stateService.setButtonState({ uploadState: false });
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
          this.isTranscriptionReady = true;
          this.isActionInProgress = false;

          this.stateService.setButtonState({ transcribeState: false });
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
      this.audioSentSuccessfully = false;
      this.blobUrl = null;
      this.stateService.setButtonState({
        blobState: false,
        uploadState: false,
        transcribeState: false
      });
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
    if (this.isTranscriptionReady && this.transcribedSuccessfully && this.fileId) {
      this.audioRecordingServices.downloadTranscription(this.fileId);
    }
  }

  saveTranscription() {
    if (this.transcribedSuccessfully && this.fileId) {
      this.audioRecordingServices.saveTranscription(this.fileId);
    }
  }

  sendTranscribeToServer() {
    if (this.transcribedSuccessfully && this.fileId) {
      this.audioRecordingServices.sendTranscribeToServer(this.fileId);
    }
  }



}
