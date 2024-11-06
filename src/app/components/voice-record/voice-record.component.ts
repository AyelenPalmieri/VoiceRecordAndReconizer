import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AudioRecordingService, RecordedBlob } from '../../services/audio-recording.service';
import { DomSanitizer } from '@angular/platform-browser';
import { BehaviorSubject, combineLatest, Observable, Subject, timer } from 'rxjs';
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
  // isActionInProgress = false;
  startTime = '0:00';
  isBlinking = false;
  // audioSentSuccessfully = false;
  // isTranscriptionReady = false;
  transcriptionText: string  | null = null; // Almacena la transcripción formateada

  htmlContent:string = '';
  private recordedBlob!: RecordedBlob;
  private ngUnsubscribe = new Subject<void>();
  private blinkStopper = new Subject<void>();
  private transcriptionText$ = new BehaviorSubject<string | null>(null);
  private quillInstance: any;

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

  disableUploadMethod(state: { blobState: boolean; }) {
    if (state.blobState == false) {
      this.disableUpload = true
    }
    if (state.blobState == true) {
      this.disableUpload = false
    }
  }

  disableDownloadMethod(state: { blobState: boolean; }) {
    if (state.blobState == false) {
      this.disableDownload = true
    }
    if (state.blobState == true) {
      this.disableDownload= false
    }
  }

  disableDeletedMethod(state:{ blobState: boolean; }) {
    if (state.blobState === false) {
      this.disableDeleted = true
    }
    if (state.blobState === true) {
      this.disableDeleted = false
    }
    // console.log('Estado de blobState:', state.blobState, 'Estado de disableDeleted:', this.disableDeleted);
  }

  disableTranscribedMethod(state: { uploadState: boolean; }) {
    if (state.uploadState == false) {
      this.disableTranscribe = true
    }
    if (state.uploadState == true) {
      this.disableTranscribe = false
    }
  }

  disableUploadTranscribeMethod(state: { uploadState: boolean; transcribeState: boolean; }) {
    if (state.uploadState == false) {
      this.disableUploadTranscribe = true
    }
    if (state.transcribeState == false) {
      this.disableUploadTranscribe = true
    }
    if (state.uploadState == true && state.transcribeState == true) {
      this.disableUploadTranscribe = false
    }
  }

  disableDownloadTranscribeMethod(state: { uploadState: boolean; transcribeState: boolean; }) {
    if (state.uploadState == false) {
      this.disableDownloadTranscribe = true
    }
    if (state.transcribeState == false) {
      this.disableDownloadTranscribe = true
    }
    if (state.uploadState == true && state.transcribeState == true) {
      this.disableDownloadTranscribe = false
    }
  }

  ngOnInit(): void {
    this.transcriptionText$.next(null);
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
    // this.isActionInProgress = true;
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
    // this.isActionInProgress = false;
    // this.isTranscriptionReady = false;
  }

  sendAudioToServer() {
    if (!this.isRecording && this.recordedBlob) {
      // Deshabilitar el boton de transcripcion y configurar el estado de carga antes de enviar la solicitud
      this.stateService.setButtonState({
        blobState: false,
        transcribeState: false,
        uploadState: false,
      });
      // this.isActionInProgress = true;

      this.audioRecordingServices.sendAudioToServer(this.recordedBlob.blob, this.recordedBlob.title)
        .subscribe(
          response => {
            // console.log('Archivo de audio enviado con exito al servidor');
            // console.log(this.recordedBlob)

            // Guardar el file_id que se recibe de la respuesta del backend
            if (response && response.file_id) {
              this.fileId = response.file_id;
              // this.audioSentSuccessfully = true;

              // Habilitar el boton de transcripcion solo si la respuesta es exitosa
              this.stateService.setButtonState({
                blobState: false,
                uploadState: true,
                transcribeState: false
              });
            }else {
              // Si no hay file_id en la respuesta, mantener el boton deshabilitado
              this.stateService.setButtonState({
                blobState: false,
                uploadState: false,
                transcribeState: false
              });
            }

            // Marcar que la acción ha finalizado
            // this.isActionInProgress = false;

            this.snackBar.open('¡El archivo de audio se ha enviado con exito al servidor!', 'Cerrar', {
              duration: 3000,
            });

          },
          error => {
            // this.isActionInProgress = false;

            if (error.status === 412 && error.error?.error === 'El audio no contiene habla y no se almacenará.') {
              // Manejar el caso especifico de audio en silencio
              this.snackBar.open('El audio está en silencio o contiene solo ruido. No se guardará.', 'Cerrar', {
                duration: 3000,
              });

              // Habilitamos de nuevo el boton de eliminar y el estado de subida lo dejamos como esta
              this.stateService.setButtonState({
                blobState: true,
                uploadState: false,
                transcribeState: false
              });

              // console.warn('El audio esta en silencio o contiene solo ruido.');
            } else {
              // Manejar otros errores
              this.snackBar.open('Error al enviar archivo de audio al servidor', 'Cerrar', {
                duration: 3000,
              });
              // console.error('Error al enviar archivo de audio al servidor:', error);
            }

            // Mantener el boton de transcripcion deshabilitado en caso de error
            this.stateService.setButtonState({
              uploadState: false,
              transcribeState: false
            });
          }
        );
    } else {
      console.error('No se grabó ningún audio o ya hay una grabación en curso.');
    }
  }

  // Metodo que se llama cuando el editor es creado
  onEditorCreated(quill: any) {
    this.quillInstance = quill;
    // console.log("Editor creado y quillInstance asignado", this.quillInstance);

    // Obtener el contenido actual del editor
    const currentContents = this.quillInstance.getContents();
    // console.log('Contenido actual:', currentContents);

    // Buscar el primer parrafo vacio (<p></p>)
    const emptyParagraphIndex = this.findEmptyParagraphIndex(currentContents);

    // Escuchar el Subject para obtener el texto transcrito y agregarlo al editor
    this.transcriptionText$.subscribe(transcriptionText => {
      if (transcriptionText) {
        // Si encontramos un parrafo vacio, insertar el texto alla
        if (emptyParagraphIndex >= 0) {
          this.quillInstance.insertText(emptyParagraphIndex, transcriptionText);
          // console.log('Texto agregado al primer parrafo vacio:', transcriptionText);
        } else {
          console.log('No se encontró un párrafo vacío en el contenido.');
        }
      }
    });
  }

  // Metodo para encontrar el indice del primer parrafo vacio
  private findEmptyParagraphIndex(contents: any): number {
    for (let i = 0; i < contents.ops.length; i++) {
      // Comprobamos si la operacion es un parrafo vacio
      if (contents.ops[i].insert === '' || (contents.ops[i].insert && contents.ops[i].insert.trim() === '')) {
        return i;
      }
    }
    return -1;
  }

  transcribeAudio() {
    // Verifica que el archivo de audio fue enviado exitosamente
    if (this.fileId) {
      // Inicialmente, deshabilitar el boton de guardar transcripcion
      this.stateService.setButtonState({
        blobState: false,
        transcribeState: false,
        uploadState: false,
      });
      // this.isActionInProgress = true;

      this.audioRecordingServices.transcribeAudio(this.fileId).subscribe(
        response => {
          // Verifica si la respuesta contiene el campo 'formatted_report'
          if (response && response.formatted_report) {
            console.log('Transcripción completada:', response.formatted_report);

            const transcriptionTextToEditor = response.formatted_report

            // Asigna el texto formateado al Subject para que el editor lo reciba
            this.transcriptionText$.next(transcriptionTextToEditor);

            // console.log(this.transcriptionText$)

            // Actualizar los estados despues de recibir la confirmacion de transcripcion
            this.transcribedSuccessfully = true;
            // this.isTranscriptionReady = true;
            // this.isActionInProgress = false;

            // Habilitar el boton para guardar la transcripcion y boton de descarga de transcripcion
            this.stateService.setButtonState({
              transcribeState: true,
              uploadState: true,
            });

            this.snackBar.open('Transcripción completada con éxito!', 'Cerrar', { duration: 3000 });

          } else {
            console.error('No se recibió un reporte de transcripción válido.');

            // this.isActionInProgress = false;
            // En caso de que no se reciba el reporte esperado
            this.stateService.setButtonState({
              transcribeState: true, // Rehabilitar el boton de transcripcion
            });

            this.snackBar.open('Error: No se pudo obtener la transcripción', 'Cerrar', { duration: 3000 });
          }
        },
        error => {
          console.error('Error al transcribir el archivo:', error);
          // this.isActionInProgress = false;

          // Rehabilitar el boton de transcripcion si hay un error
          this.stateService.setButtonState({
            transcribeState: true,
          });
          this.snackBar.open('Error al transcribir el archivo', 'Cerrar', { duration: 3000 });
        }
      );
    } else {
      console.error('No se ha encontrado el file_id o ya hay una transcripción en curso.');
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
          return timer(this.isBlinking ? 500 : 800); // Duracion del encendido o apagado
        })
      )
      .subscribe();
  }

  stopBlinking() {
    this.blinkStopper.next(); // Cancela el parpadeo
    this.isBlinking = false; // Asegura que el estado esté apagado
  }

  deleteRecording() {
    if (!this.isRecording) {
      // console.log('delete recorded')
      this.audioRecordingServices.deleteRecording();
      // this.audioSentSuccessfully = false;
      this.blobUrl = null;
      this.stateService.setButtonState({
        blobState: false,
        uploadState: false,
        transcribeState: false
      });
    }
  }

  downloadRecording() {
    if (!this.isRecording) {
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

  sendTranscribeToServer() {
    if (this.transcribedSuccessfully && this.fileId) {
      this.audioRecordingServices.sendTranscribeToServer(this.fileId);
    }
  }

}
