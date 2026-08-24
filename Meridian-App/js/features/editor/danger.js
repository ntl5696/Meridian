window.FS.editor = window.FS.editor || {};

window.FS.editor.clearDangerAlerts = function () {
    window.FS.dom.overlayDanger.className = 'overlay-danger';
    window.FS.dom.editorTextarea.classList.remove('hardcore-fading-text');

    if (window.FS.state.hardcoreCountdownActive) {
        window.FS.state.hardcoreCountdownActive = false;
        window.FS.dom.hardcoreCountdown.classList.add('hidden');
        if (window.FS.state.hardcoreTimerInstance) {
            clearInterval(window.FS.state.hardcoreTimerInstance);
            window.FS.state.hardcoreTimerInstance = null;
        }
    }
};

window.FS.editor.startFlowCheckingTimer = function () {
    if (window.FS.state.flowStateTimer) clearInterval(window.FS.state.flowStateTimer);

    window.FS.state.flowStateTimer = setInterval(() => {
        if (!window.FS.state.sessionActive) return;

        const idleTime = Date.now() - window.FS.state.lastTypedTime;
        const timeSinceLastKeystroke = Date.now() - window.FS.state.lastKeystrokeTime;

        if (timeSinceLastKeystroke > 3000) {
            document.body.classList.remove('body-focus-active');
        } else {
            document.body.classList.add('body-focus-active');
        }

        if (window.FS.state.sessionMode === 'nudge') {
            if (idleTime > 5000) {
                window.FS.dom.overlayDanger.className = 'overlay-danger active-nudge';
            }
        } else if (window.FS.state.sessionMode === 'hardcore') {
            if (idleTime > 5000 && !window.FS.state.hardcoreCountdownActive) {
                window.FS.editor.triggerHardcoreFadeCountdown();
            }
        }
    }, 150);
};

window.FS.editor.triggerHardcoreFadeCountdown = function () {
    window.FS.state.hardcoreCountdownActive = true;
    window.FS.state.hardcoreTimeLeft = 5.0;

    window.FS.dom.overlayDanger.className = 'overlay-danger active-hardcore';
    window.FS.dom.editorTextarea.classList.add('hardcore-fading-text');
    window.FS.dom.hardcoreCountdown.classList.remove('hidden');
    window.FS.dom.countdownSec.innerText = window.FS.state.hardcoreTimeLeft.toFixed(1);

    if (window.FS.state.hardcoreTimerInstance) clearInterval(window.FS.state.hardcoreTimerInstance);

    window.FS.state.hardcoreTimerInstance = setInterval(() => {
        if (!window.FS.state.sessionActive || !window.FS.state.hardcoreCountdownActive) {
            clearInterval(window.FS.state.hardcoreTimerInstance);
            return;
        }

        window.FS.state.hardcoreTimeLeft -= 0.1;
        if (window.FS.state.hardcoreTimeLeft <= 0) {
            window.FS.state.hardcoreTimeLeft = 0;
            clearInterval(window.FS.state.hardcoreTimerInstance);
            window.FS.editor.hardcoreWipeout();
        }

        window.FS.dom.countdownSec.innerText = window.FS.state.hardcoreTimeLeft.toFixed(1);
    }, 100);
};

window.FS.editor.hardcoreWipeout = function () {
    window.FS.state.sessionActive = false;
    window.FS.editor.clearDangerAlerts();
    window.FS.editor.stopSessionTimers();
    
    window.FS.dom.btnAbandonSession.classList.add('hidden');
    window.FS.dom.btnCompleteSession.classList.add('hidden');
    window.FS.dom.btnEditorSoundToggle.classList.add('hidden');
    window.FS.dom.btnEditorAmbientToggle.classList.add('hidden');

    const docs = window.FS.storage.getDocumentsFromStorage();
    const doc = docs.find(d => d.id === window.FS.state.activeDocId);

    window.FS.state.sessionText = doc ? doc.content : "";
    window.FS.dom.editorTextarea.innerHTML = window.FS.state.sessionText;

    window.FS.editor.showSessionResults(false);
};
