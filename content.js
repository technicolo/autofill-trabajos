// Opcional: autohints o autoload de perfil
chrome.storage.sync.get(["profile", "extras", "strategy"], ({ profile, extras, strategy }) => {
  // No hace nada automáticamente para no romper ToS ni enviar datos sin querer.
  // Si quisieras autocompletar apenas carga la página, acá podrías llamar a la misma lógica del popup.
});
