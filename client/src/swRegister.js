export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('SW registered:', reg.scope);
      }).catch((err) => {
        console.log('SW registration failed:', err);
      });
    });
  }
}

export function cacheClassForOffline(classId, contentText, pdfUrl) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_CLASS',
      classId,
      contentText,
      pdfUrl
    });
  }
}

export function cacheQuestionsForOffline(classId, questions) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_QUESTIONS',
      classId,
      questions
    });
  }
}
