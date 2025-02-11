import * as pdfjsLib from 'pdfjs-dist';
import workerPath from 'pdfjs-dist/build/pdf.worker.min.js?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

export default pdfjsLib; 