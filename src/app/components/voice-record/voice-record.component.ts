import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AudioRecordingService, RecordedBlob } from '../../services/audio-recording.service';
import { DomSanitizer } from '@angular/platform-browser';
import { BehaviorSubject, Observable, Subject, timer } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StatesService } from '../../services/states.service';
import { state } from '@angular/animations';
import QuillType from 'quill';
import Delta from'quill';
import { QuillEditorComponent } from 'ngx-quill';

@Component({
  selector: 'app-voice-record',
  templateUrl: './voice-record.component.html',
  styleUrls: ['./voice-record.component.css'],
})

export class VoiceRecordComponent implements OnInit, OnDestroy {
  @ViewChild('quillEditor', { static: true }) quillEditor!: QuillEditorComponent;

  blobUrl: any;
  fileId: any;
  isRecording = false;
  isActionInProgress = false;
  startTime = '0:00';
  isBlinking = false;
  audioSentSuccessfully = false;
  isTranscriptionReady = false;
  transcriptionText: string = ''; // Almacena la transcripción formateada
  // Cambia la propiedad transcriptionText para que sea un objeto con 'html'
  // transcriptionText: { html: string } = { html: '' };
  htmlContent:string = '';
  private recordedBlob!: RecordedBlob;
  private ngUnsubscribe = new Subject<void>();
  private blinkStopper = new Subject<void>();

  disableDeleted = true;
  disableDownload = true;
  disableUpload = true;
  disableTranscribe = true;
  disableUploadTranscribe = true;
  disableDownloadTranscribe = true;

  public modulesQuill = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ font: [] }],
      [{ color: [] }, { background: [] }],
      [{ size: ['small', false, 'large', 'huge'] }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ align: [] }],
      ['blockquote', 'code-block'],
      [{ list: 'ordered'}, { list: 'bullet' }],
      ['link', 'image', 'video'],
      ['clean'],
    ]
  };

  private recordingButtonVisibilitySubject = new BehaviorSubject<boolean>(true);
  recordingButtonVisibility$: Observable<boolean> = this.recordingButtonVisibilitySubject.asObservable();

  private showUseFirstTimeMessageSubject = new BehaviorSubject<boolean>(true);
  showUseFirstTimeMessage$: Observable<boolean> = this.showUseFirstTimeMessageSubject.asObservable();

  // Variables de habilitación secuencial de botones
  transcribedSuccessfully: boolean = false;

  constructor(
    private readonly audioRecordingServices: AudioRecordingService,
    @Inject(DomSanitizer) private readonly sanitizer: DomSanitizer,
    private snackBar: MatSnackBar,
    public stateService: StatesService,
    private cdr: ChangeDetectorRef
  ) {
    this.stateService.buttonState$.subscribe((state: { blobState: any; uploadState: any; transcribeState: any }) => {
      // this.isActionInProgress = !state.blobState;
      this.disableDeletedMethod(state);
      this.disableDownloadMethod(state);
      this.disableUploadMethod(state);
      this.disableTranscribedMethod(state);
      this.disableUploadTranscribeMethod(state);
      this.disableDownloadTranscribeMethod(state);
    });
    this.getRecordedBlob();
    this.getRecordingTime();
    this.getRecordedFailed();
  }

  // onChangedEditor(event: any): void {
  //   if (event.html) {
  //       this.htmlContent = event.html;
  //     }
  // }

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

  disableTranscribedMethod(state: { blobState: any; uploadState: any; }) {
    if (state.blobState == false) {
      this.disableTranscribe = true
    }
    if (state.uploadState == false) {
      this.disableTranscribe = true
    }
    if (state.blobState == true && state.uploadState == true) {
      this.disableTranscribe = false
    }
  }

  disableUploadTranscribeMethod(state: { blobState: any; uploadState: any; transcribeState: any; }) {
    if (state.blobState == false) {
      this.disableUploadTranscribe = true
    }
    if (state.uploadState == false) {
      this.disableUploadTranscribe = true
    }
    if (state.transcribeState == false) {
      this.disableUploadTranscribe = true
    }
    if (state.blobState == true && state.uploadState == true && state.transcribeState == true) {
      this.disableUploadTranscribe = false
    }
  }

  disableDownloadTranscribeMethod(state: { blobState: any; uploadState: any; transcribeState: any; }) {
    if (state.blobState == false) {
      this.disableDownloadTranscribe = true
    }
    if (state.uploadState == false) {
      this.disableDownloadTranscribe = true
    }
    if (state.transcribeState == false) {
      this.disableDownloadTranscribe = true
    }
    if (state.blobState == true && state.uploadState == true && state.transcribeState == true) {
      this.disableDownloadTranscribe = false
    }
  }

  ngOnInit(): void {
    this.quillEditor?.quillEditor?.setText("holaaaa")
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
      uploadState: false,
      transcribeState: false
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
      // Deshabilitar el botón de transcripción y configurar el estado de carga antes de enviar la solicitud
      this.stateService.setButtonState({
        blobState: false,
        transcribeState: false,
        uploadState: false,
      });
      this.isActionInProgress = true; // Marcar que la acción está en progreso

      this.audioRecordingServices.sendAudioToServer(this.recordedBlob.blob, this.recordedBlob.title)
        .subscribe(
          response => {
            console.log('Archivo de audio enviado con exito al servidor');
            // console.log(this.recordedBlob)

            // Guardar el file_id que se recibe de la respuesta del backend
            if (response && response.file_id) {
              this.fileId = response.file_id;
              this.audioSentSuccessfully = true;

              // Habilitar el botón de transcripción solo si la respuesta es exitosa
              this.stateService.setButtonState({
                blobState: true,
                uploadState: true,
                transcribeState: true
              }); // Solo si el backend confirma el guardado
            }else {
              // Si no hay file_id en la respuesta, mantener el botón deshabilitado
              this.stateService.setButtonState({
                blobState: false,
                uploadState: false,
                transcribeState: false
              });
            }

            // Marcar que la acción ha finalizado
            this.isActionInProgress = false;

            this.snackBar.open('¡El archivo de audio se ha enviado con exito al servidor!', 'Cerrar', {
              duration: 3000,
            });

          },
          error => {
            this.isActionInProgress = false;

            if (error.status === 412 && error.error?.error === 'El audio no contiene habla y no se almacenará.') {
              // Manejar el caso específico de audio en silencio
              this.snackBar.open('El audio está en silencio o contiene solo ruido. No se guardará.', 'Cerrar', {
                duration: 3000,
              });
              console.warn('El audio está en silencio o contiene solo ruido.');
            } else {
              // Manejar otros errores
              this.snackBar.open('Error al enviar archivo de audio al servidor', 'Cerrar', {
                duration: 3000,
              });
              console.error('Error al enviar archivo de audio al servidor:', error);
            }
            // this.snackBar.open('Error al enviar archivo de audio al servidor', 'Cerrar', {
            //   duration: 3000,
            // });
            // console.error('Error al enviar archivo de audio al servidor:', error);
            // this.isActionInProgress = false;

            // Mantener el botón de transcripción deshabilitado en caso de error
            this.stateService.setButtonState({
              blobState: false,
              uploadState: false,
              transcribeState: false
            });
          }
        );
    } else {
      console.error('No se grabó ningún audio o ya hay una grabación en curso.');
    }
  }

  transcribeAudio() {
    // Verifica que no haya otra acción en curso y que el archivo de audio fue enviado exitosamente
    if (this.fileId && this.audioSentSuccessfully && !this.isActionInProgress) {
      // Inicialmente, deshabilitar el botón de guardar transcripción y marcar que está en progreso
      this.stateService.setButtonState({
        blobState: false,
        transcribeState: false,
        uploadState: false,
      });
      this.isActionInProgress = true;

      this.audioRecordingServices.transcribeAudio(this.fileId).subscribe(
        response => {
          console.log('Transcripción completada:', response.formatted_report);

          // Asigna el reporte formateado al editor Quill
          this.transcriptionText = response.formatted_report.replace(/<\/?[^>]+(>|$)/g, "");


          //VERIFICAR, NO FUNCIONA
          // Asegúrate de que Quill esté listo y actualiza el contenido
           if (this.quillEditor && this.quillEditor.quillEditor) {
            console.log("sss");

             this.quillEditor.quillEditor.setText(this.transcriptionText, 'api');
           }

          // // Verifica si quillEditor está inicializado y establece el contenido
          // if (this.quillEditor && this.quillEditor.quillEditor) {
          //   const delta = this.quillEditor.quillEditor.clipboard.convert(this.transcriptionText);
          //   this.quillEditor.quillEditor.setContents(delta); // Establece el contenido del editor
          // }

          // // Fuerza la detección de cambios
          // this.cdr.detectChanges();

          console.log(this.transcriptionText)

          // Actualizar los estados después de recibir la confirmación de transcripción
          this.transcribedSuccessfully = true; // Habilitar guardar y descargar transcripción
          this.isTranscriptionReady = true;
          this.isActionInProgress = false;

          // Habilitar el botón para guardar la transcripción
          this.stateService.setButtonState({
            transcribeState: true
          });

          this.isActionInProgress = false; // La acción ha terminado
          this.stateService.setButtonState({
            transcribeState: false
          });

          this.stateService.setButtonState({ transcribeState: false });
          this.snackBar.open('Transcripción completada con éxito!', 'Cerrar', { duration: 3000 });
          // Manejar la transcripcion como mostrarla en CKEditor (NO IMPLEMENTADO)
        },
        error => {
          console.error('Error al transcribir el archivo:', error);
          this.isActionInProgress = false;

          // Rehabilitar el botón de transcripción si hay un error
          this.stateService.setButtonState({
            transcribeState: true
          });
          this.snackBar.open('Error al transcribir el archivo', 'Cerrar', { duration: 3000 });
        }
      );
    } else {
      console.error('No se ha encontrado el file_id o ya hay una transcripción en curso.');
    }
  }

  // Captura cambios en el editor
   onChangedEditor(event: any): void {
     if (event.html) {
       this.htmlContent = event.html;
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
