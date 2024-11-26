export class CanvasRecorder {
    constructor() {
      this.mediaRecorder = null;
      this.recordedChunks = [];
      this.isRecording = false;
    }
  
    async startRecording(canvas) {
      if (!canvas) {
        throw new Error('Canvas element is required');
      }
  
      try {
        const stream = canvas.captureStream(30);
        const options = {
          mimeType: 'video/webm;codecs=vp8',
          videoBitsPerSecond: 2500000
        };
  
        this.recordedChunks = [];
        this.mediaRecorder = new MediaRecorder(stream, options);
        
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.recordedChunks.push(event.data);
          }
        };
  
        // Update UI before starting recording
        const recordButton = document.getElementById('recordButton');
        const downloadWebM = document.getElementById('downloadWebM');
        
        if (recordButton) {
          recordButton.textContent = 'Stop Recording';
          recordButton.classList.add('recording');
        }
        if (downloadWebM) downloadWebM.disabled = true;
  
        // Start recording after UI update
        this.mediaRecorder.start(100);
        this.isRecording = true;
  
      } catch (error) {
        console.error('Recording start error:', error);
        this.isRecording = false;
        throw error;
      }
    }
  
    stopRecording() {
      if (this.mediaRecorder?.state !== 'inactive') {
        this.mediaRecorder.stop();
        this.isRecording = false;
  
        // Update UI
        const recordButton = document.getElementById('recordButton');
        const downloadWebM = document.getElementById('downloadWebM');
        
        if (recordButton) {
          recordButton.textContent = 'Start Recording';
          recordButton.classList.remove('recording');
        }
        if (downloadWebM) downloadWebM.disabled = false;
      }
    }
  
    downloadVideo() {
      if (this.recordedChunks.length === 0) return;
  
      try {
        const webmBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
        this.createDownload(webmBlob, 'animation.webm');
      } catch (error) {
        console.error('Download error:', error);
        throw error;
      }
    }
  
    createDownload(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    }
  }