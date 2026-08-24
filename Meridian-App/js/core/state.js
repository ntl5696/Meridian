window.FS = {
    state: {
        currentView: 'home',
        currentTheme: localStorage.getItem('flowstate_theme') || 'light',
        activeDocId: null,
        sidebarCollapsed: false,
        setupSidebarHidden: localStorage.getItem('flowstate_setup_hidden') === 'true',
        searchQuery: '',
        sessionActive: false,
        sessionText: '',
        sessionMode: 'standard',
        sessionGoalType: 'time',
        timeElapsed: 0,
        timeTarget: 0,
        wordsTarget: 0,
        wordsCount: 0,
        averageWpm: 0,
        lastTypedTime: null,
        lastKeystrokeTime: null,
        sessionTimer: null,
        flowStateTimer: null,
        sessionHistoryPoints: [],
        hardcoreCountdownActive: false,
        hardcoreTimerInstance: null,
        hardcoreTimeLeft: 5.0
    },
    dom: {}
};
